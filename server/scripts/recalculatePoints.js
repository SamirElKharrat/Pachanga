const sequelize = require('../config/configdb');
const LeagueParticipation = require('../models/leagueParticipation');
const Result = require('../models/result');
const Match = require('../models/match');
const Prediction = require('../models/prediction');
const User = require('../models/user');
const League = require('../models/league');
const { getLeagueWeekNumber } = require('../controllers/weekController');
const { calculatePredictionPoints } = require('../utils/pointsCalculator');
const Team = require('../models/team');

// Relaciones
User.belongsToMany(League, { through: 'LeagueParticipation' });
League.belongsToMany(User, { through: 'LeagueParticipation' });
Team.belongsToMany(Match, { through: 'TeamMatches' });
Match.belongsToMany(Team, { through: 'TeamMatches' });
Result.belongsTo(Match, { foreignKey: 'match_id', as: 'Match' });
Match.hasOne(Result, { foreignKey: 'match_id', as: 'Result' });

const runMigration = async () => {
    try {
        console.log("Starting CUMULATIVE points recalculation migration...");

        await sequelize.authenticate();
        console.log("Database connection successful.");
        
        console.log("Syncing database schema...");
        await sequelize.sync({ alter: true });
        console.log("Database sync completed.");

        // 1. Limpiar toda la tabla
        console.log("Clearing all existing LeagueParticipation rows...");
        await LeagueParticipation.destroy({ where: {} });

        // 2. Obtener todas las ligas y resultados
        const leagues = await League.findAll();
        const results = await Result.findAll({
            include: [{ model: Match, as: 'Match' }],
            order: [[{ model: Match, as: 'Match' }, 'date', 'ASC']]
        });

        // tempGains[leagueId][userId][week] = points_gained_in_that_specific_week
        const tempGains = {};
        // userLeagues[leagueId] = Set<userId> (to know who is in which league)
        const userLeagues = {};

        // 3. Passe 1: Calcular puntos ganados por cada semana individual
        console.log("Pass 1: Calculating points gained per week...");
        for (const result of results) {
            const match = result.Match;
            if (!match) continue;

            const predictions = await Prediction.findAll({ 
                where: { match_id: match.id }
            });
            
            const league = leagues.find(l => l.id === match.league_id);
            if (!league) continue;

            const weekNum = getLeagueWeekNumber(league.start_date, match.date);

            if (!tempGains[match.league_id]) tempGains[match.league_id] = {};
            if (!userLeagues[match.league_id]) userLeagues[match.league_id] = new Set();
            
            const lg = tempGains[match.league_id];
            const ul = userLeagues[match.league_id];

            for (const pred of predictions) {
                const points = await calculatePredictionPoints({
                    prediction: pred,
                    match,
                    winner: result.winner,
                    resultStr: result.result
                });

                // Actualizar puntos del Prediction siempre para que el front los vea
                await pred.update({ points });

                // Registrar al usuario en la liga
                ul.add(pred.user_id);

                if (points > 0) {
                    if (!lg[pred.user_id]) lg[pred.user_id] = {};
                    lg[pred.user_id][weekNum] = (lg[pred.user_id][weekNum] || 0) + points;
                }
            }
        }

        // 4. Passe 2: Calcular totales acumulados y persistir en DB
        console.log("Pass 2: Calculating cumulative totals and saving to DB...");
        for (const league of leagues) {
            const leagueId = league.id;
            const lgGains = tempGains[leagueId] || {};
            const participants = userLeagues[leagueId] || new Set();

            // Calcular cuántas semanas tiene la liga en total usando la misma lógica que el front
            const totalWeeks = getLeagueWeekNumber(league.start_date, league.end_date);

            console.log(`  Processing League ${leagueId} (${league.name}) - ${totalWeeks} weeks`);

            for (const userId of participants) {
                let cumulativeTotal = 0;
                
                // Crear una fila para CADA semana de la liga, manteniendo el acumulado
                for (let w = 1; w <= totalWeeks; w++) {
                    const gainedThisWeek = (lgGains[userId] && lgGains[userId][w]) ? lgGains[userId][w] : 0;
                    cumulativeTotal += gainedThisWeek;

                    await LeagueParticipation.create({
                        user_id: userId,
                        league_id: leagueId,
                        week: w,
                        points: cumulativeTotal
                    });
                }

                // Fila de membresía (week: -1) con el total final para consistencia rápida
                await LeagueParticipation.create({
                    user_id: userId,
                    league_id: leagueId,
                    week: -1,
                    points: cumulativeTotal
                });
            }
        }

        console.log("Migration completed successfully with PHYSICAL CUMULATIVE totals!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};


runMigration();
