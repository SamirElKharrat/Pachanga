const PachangaPoint = require('../models/pachangaPoint');
const User = require('../models/user');
const League = require('../models/league');
const LeagueParticipation = require('../models/leagueParticipation');
const { Sequelize, Op } = require('sequelize');

const DEFAULT_RULES_2026 = `Hola, bienvenidos a la Pachanga 2026.

Este año tendremos 6 competiciones en total:
- LEC Versus (LEC)
- Last Stand (Internacional)
- Spring Split (LEC)
- MSI (Internacional)
- Summer Split (LEC)
- Worlds (Internacional) (FabriFraude)

Este año va a ser básicamente como el anterior en casi todo.

El tema de los puntos funciona de la siguiente manera:
- Los BO1 dan 2 puntos por acierto.
- Los BO3 dan 2 puntos por victoria y 3 por resultado.
- Los BO5 dan 2 puntos por victoria y 5 por resultado.

Los plenos van a cambiar este año, ya que con la web a veces una semana hay 2 partidos, o 5 o más. Ahora funcionará así:
- Los plenos serán cuando se acierten mínimo más de 1 partido.
- Como la web funciona semanal, para hacerte un pleno completo tendrás que adivinar todos los partidos de esa semana.
- Adivinar 3 partidos seguidos dará 1 punto; adivinar 5 dará 2 puntos; y adivinar más de 5 dará 3 puntos.

Seguiremos con los equipos favoritos, dando +1 punto por acertar su resultado y su victoria. También tendremos los puntos finales según dónde terminó tu equipo:
- 1.º: 20 puntos
- 2.º: 16 puntos
- 3.º: 12 puntos
- 4.º: 10 puntos
- 5.º: 8 puntos
- 6.º: 6 puntos
- 7.º: 5 puntos
- 8.º: 3 puntos

Se está mejorando la web en errores y cosas que tienen que ponerse, y no va a dar tiempo para este finde, por lo cual seguiremos jugando con la versión anterior de la Pachanga. La idea es en el MSI tener la nueva versión con todo lo nuevo y la posibilidad de tener preguntas de nuevo.

Recordad, como siempre: si tenéis ideas o errores que habéis visto, comentádmelo :)

El tema de los premios, pues como el año pasado.

Por cada competición, el top 3 se apuntará puntos que se usarán al final para declarar el top 3 de los mejores de la Pachanga:
- 1.º = 5 puntos
- 2.º = 3 puntos
- 3.º = 1 punto

Los premios, que pueden cambiar, son los siguientes:
- 1.º: 20 € para el LoL u otro juego
- 2.º: 10 € para el LoL u otro juego
- 3.º: 5 € para el LoL u otro juego

El Mundial tiene premios propios, como los del año pasado:
- 10 € en RP o en otro juego.
- Si el ganador del Mundial es tu equipo y tú has ganado la competición, la skin vendrá con su edición superior (con el chroma y todo lo demás).
- Si el ganador del Mundial es un equipo europeo, es tu equipo favorito y tú has ganado la competición, te llevarás la camiseta del equipo (puede ser la del siguiente año o la de Worlds).
- Los 10 € son el premio base; si se cumplen las dos condiciones, se cambian por el premio monetario, y si no quieres ni la skin ni la camiseta, pues RP con el valor.`;

/**
 * Get full Pachanga standings grouped by user for a specific year
 */
exports.getStandings = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const year = parseInt(req.query.year, 10) || currentYear;

        // Fetch all points for the target year
        const pointEntries = await PachangaPoint.findAll({
            where: { year },
            include: [{
                model: User,
                as: 'User',
                attributes: ['id', 'username', 'logo_url']
            }],
            order: [['date', 'DESC'], ['id', 'DESC']]
        });

        // Group points by user
        const userMap = {};
        pointEntries.forEach(entry => {
            const uid = entry.user_id;
            if (!userMap[uid]) {
                userMap[uid] = {
                    id: uid,
                    username: entry.User?.username || `Usuario #${uid}`,
                    logo_url: entry.User?.logo_url || null,
                    totalPoints: 0,
                    breakdown: []
                };
            }
            userMap[uid].totalPoints += entry.points;
            userMap[uid].breakdown.push({
                id: entry.id,
                competition_name: entry.competition_name,
                points: entry.points,
                position: entry.position,
                league_id: entry.league_id,
                date: entry.date
            });
        });

        // Sort by total points descending
        const standings = Object.values(userMap)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map((player, idx) => ({
                ...player,
                rank: idx + 1
            }));

        // Get available years from PachangaPoint and Leagues
        const pointYears = await PachangaPoint.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('year')), 'year']],
            raw: true
        });

        const leagueYears = await League.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.fn('EXTRACT', Sequelize.literal('YEAR FROM start_date'))), 'year']],
            raw: true
        });

        const yearsSet = new Set([currentYear]);
        pointYears.forEach(r => r.year && yearsSet.add(parseInt(r.year, 10)));
        leagueYears.forEach(r => r.year && yearsSet.add(parseInt(r.year, 10)));
        const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

        res.json({
            year,
            availableYears,
            standings
        });
    } catch (error) {
        console.error("Error in getStandings:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Manually create a point entry (Admin only)
 */
exports.createPointEntry = async (req, res) => {
    try {
        const { user_id, competition_name, points, position, year, league_id, date } = req.body;

        if (!user_id || !competition_name || points === undefined) {
            return res.status(400).json({ error: 'user_id, competition_name y points son obligatorios' });
        }

        const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

        const entry = await PachangaPoint.create({
            user_id,
            competition_name,
            points: parseInt(points, 10),
            position: position ? parseInt(position, 10) : null,
            year: targetYear,
            league_id: league_id || null,
            date: date ? new Date(date) : new Date()
        });

        res.status(201).json(entry);
    } catch (error) {
        console.error("Error in createPointEntry:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete a point entry (Admin only)
 */
exports.deletePointEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await PachangaPoint.findByPk(id);
        if (!entry) {
            return res.status(404).json({ error: 'Registro de puntos no encontrado' });
        }

        await entry.destroy();
        res.json({ message: 'Puntos eliminados correctamente' });
    } catch (error) {
        console.error("Error in deletePointEntry:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Auto-sync Pachanga points for finished leagues (excluding Worlds)
 */
exports.syncFinishedLeaguePachangaPoints = async (leagueId) => {
    try {
        const league = await League.findByPk(leagueId);
        if (!league || league.status !== 'finished') return;

        // Worlds does NOT count for Pachanga standings
        const isWorlds = league.name && league.name.toLowerCase().includes('worlds');
        if (isWorlds) {
            console.log(`[Pachanga] Skipping Pachanga points for ${league.name} (Worlds exclusion)`);
            return;
        }

        const leagueYear = league.start_date ? new Date(league.start_date).getFullYear() : new Date().getFullYear();

        // Get top 3 participants from week = -1
        const topParticipants = await LeagueParticipation.findAll({
            where: {
                league_id: leagueId,
                week: -1
            },
            order: [['points', 'DESC']],
            limit: 3
        });

        if (!topParticipants || topParticipants.length === 0) return;

        const pointsDistribution = [
            { pos: 1, pts: 5 },
            { pos: 2, pts: 3 },
            { pos: 3, pts: 1 }
        ];

        for (let i = 0; i < topParticipants.length; i++) {
            const p = topParticipants[i];
            const dist = pointsDistribution[i];
            if (!dist) continue;

            const existing = await PachangaPoint.findOne({
                where: {
                    user_id: p.user_id,
                    league_id: leagueId
                }
            });

            if (!existing) {
                await PachangaPoint.create({
                    user_id: p.user_id,
                    league_id: leagueId,
                    competition_name: league.name,
                    year: leagueYear,
                    points: dist.pts,
                    position: dist.pos,
                    date: league.end_date || new Date()
                });
                console.log(`[Pachanga] Awarded ${dist.pts} pts to user ${p.user_id} for ${league.name} (Pos: ${dist.pos})`);
            }
        }
    } catch (error) {
        console.error("Error in syncFinishedLeaguePachangaPoints:", error);
    }
};

/**
 * Get rules Markdown for a specific year
 */
exports.getRules = async (req, res) => {
    try {
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        res.json({
            year,
            rules: DEFAULT_RULES_2026
        });
    } catch (error) {
        console.error("Error in getRules:", error);
        res.status(500).json({ error: error.message });
    }
};
