const { Op } = require('sequelize');
const League = require('../models/league');
const Team = require('../models/team');
const sequelize = require('../config/configdb');
const hallController = require('./hallController');
const pachangaController = require('./pachangaController');


// Get all leagues
exports.getAllLeagues = async (req, res) => {
    try {
        const leagues = await League.findAll({
            include: [{
                model: Team,
                attributes: ['name'],
                through: { attributes: [] }
            }]
        });
        res.json(leagues);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Qué piel debe llevar la web ahora mismo. Público a propósito.
 *
 * Va sin `authenticateJwtToken` porque quien más lo necesita es la pantalla de
 * login, que todavía no tiene sesión y es justo donde más luce el escudo del
 * mundial. Lo que devuelve —nombre, logo y fechas de una competición— es
 * información pública de todos modos.
 *
 * La regla, entera:
 *
 *   1. la liga está marcada como el mundial            theme = 'worlds'
 *   2. no se ha dado por terminada                     status != 'finished'
 *   3. y no se ha pasado de su fecha de fin            now <= end_date
 *
 * El punto 3 es el cinturón de seguridad. El estado lo mueve
 * `checkAndUpdateLeagues()` en el cliente, que solo corre cuando alguien abre la
 * portada; si nadie entra en tres días después de la final, la liga seguiría
 * marcada 'live' y la web seguiría dorada. Comparando también con la fecha, el
 * tema se apaga el día que toca aunque la base de datos vaya con retraso.
 */
exports.getActiveTheme = async (req, res) => {
    try {
        const league = await League.findOne({
            where: {
                theme: 'worlds',
                status: { [Op.ne]: 'finished' },
                end_date: { [Op.gte]: new Date() }
            },
            order: [['start_date', 'DESC']],
            attributes: ['id', 'name', 'logo_url', 'status', 'start_date', 'end_date']
        });

        if (!league) {
            return res.json({ theme: 'default', league: null });
        }

        res.json({
            theme: 'worlds',
            league: {
                id: league.id,
                name: league.name,
                logo_url: league.logo_url,
                status: league.status,
                start_date: league.start_date,
                end_date: league.end_date
            }
        });
    } catch (error) {
        // Que la piel no tumbe la web: si esto falla, se responde "tema normal".
        console.error('No se pudo resolver el tema activo:', error.message);
        res.json({ theme: 'default', league: null });
    }
};

//Get Teams that play in x league
exports.getTeamsByLeague = async (req, res) => {
    try {
        const league = await League.findByPk(req.params.id, {
            include: [{
                model: Team,
                attributes: [['id', 'value'], ['name', 'label']],
                through: { attributes: [] }
            }]
        });
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }
        res.json(league);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get league by ID
exports.getLeagueById = async (req, res) => {
    try {
        const league = await League.findByPk(req.params.id, {
            include: [{
                model: Team,
                attributes: ['id', 'name', 'logo_url'],
                through: { attributes: [] }
            }]
        });
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }
        res.json(league);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create league
exports.createLeague = async (req, res) => {
    try {
        const league = await League.create(req.body);
        const teams = await Team.findAll({ where: { id: req.body.teams } });
        league.addTeams(teams);
        res.status(201).json(league);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update league
exports.updateLeague = async (req, res) => {
    try {
        const league = await League.findByPk(req.params.id);
        if (req.body.teams) {
            const teams = await Team.findAll({ where: { id: req.body.teams } });
            league.addTeams(teams);
        }
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }
        const updatedLeague = await league.update(req.body);
        if (req.body.status === 'finished') {
            await hallController.syncFinishedLeagueWinners();
            await pachangaController.syncFinishedLeaguePachangaPoints(updatedLeague.id);
        }
        res.json(updatedLeague);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete league
/**
 * Todo lo que cuelga de una liga, en el orden en que hay que borrarlo para que
 * ninguna clave foránea lo impida: primero lo que apunta a partidos y preguntas,
 * luego partidos y preguntas, luego jornadas, y al final lo que apunta a la liga.
 *
 * Los equipos y los usuarios NO están: son de la web, no de la liga. Solo se borra
 * su enlace con ella (TeamLeagues, LeagueParticipation…).
 *
 * Se borra todo a mano, sin fiarse de los ON DELETE CASCADE: la base de producción
 * nació de `db.sync` y no tiene por qué tener las mismas reglas que la local. Y
 * `Rule` tiene SET NULL: dejarla al cascade convertiría las normas de la liga en
 * normas generales de la web, que es justo lo que significa `league_id` vacío.
 *
 * Cada paso: [qué es, para el resumen; SQL con :id].
 */
const MATCHES_OF = `SELECT id FROM "Match" WHERE league_id = :id`;
const LEAGUE_CASCADE = [
    // Las cartas, lo primero: sus jugadas apuntan a partidos, jornadas y a la mano.
    ['duelos', `DELETE FROM "Duel" WHERE league_id = :id`],
    ['aperturasDeCofre', `DELETE FROM "ChestOpen" WHERE league_id = :id`],
    ['jugadasDeCartas', `DELETE FROM "CardPlay" WHERE league_id = :id`],
    ['cartas', `DELETE FROM "UserCard" WHERE league_id = :id`],
    ['respuestas', `DELETE FROM "QuestionAnswer" WHERE question_id IN (SELECT id FROM "Question" WHERE league_id = :id)`],
    ['preguntas', `DELETE FROM "Question" WHERE league_id = :id`],
    ['predicciones', `DELETE FROM "Prediction" WHERE match_id IN (${MATCHES_OF})`],
    ['resultados', `DELETE FROM "Result" WHERE match_id IN (${MATCHES_OF})`],
    ['estadisticasPartido', `DELETE FROM "MatchStat" WHERE league_id = :id OR match_id IN (${MATCHES_OF})`],
    ['equiposDePartido', `DELETE FROM "TeamMatches" WHERE match_id IN (${MATCHES_OF})`],
    ['partidos', `DELETE FROM "Match" WHERE league_id = :id`],
    ['jornadas', `DELETE FROM "Round" WHERE league_id = :id`],
    ['equiposFavoritos', `DELETE FROM "FavoriteTeam" WHERE league_id = :id`],
    ['participaciones', `DELETE FROM "LeagueParticipation" WHERE league_id = :id`],
    ['estadisticasJornada', `DELETE FROM "PlayerWeekStat" WHERE league_id = :id`],
    ['estadisticasLiga', `DELETE FROM "PlayerLeagueStat" WHERE league_id = :id`],
    ['hallOfFlame', `DELETE FROM "Hall" WHERE league_id = :id`],
    ['puntosPachanga', `DELETE FROM "PachangaPoint" WHERE league_id = :id`],
    ['normas', `DELETE FROM "Rule" WHERE league_id = :id`],
    ['equiposDeLiga', `DELETE FROM "TeamLeagues" WHERE league_id = :id`],
    // Las monedas NO se borran: son del jugador y valen en todas las ligas. Solo se
    // olvida de qué liga salieron.
    ['monedasDesenlazadas', `UPDATE "CoinTransaction" SET league_id = NULL WHERE league_id = :id`],
];

/**
 * Borra una liga y todo lo suyo (ver LEAGUE_CASCADE), todo o nada.
 *
 * Antes cada borrado iba en un `forEach(async …)` sin esperar: la liga se borraba
 * antes que sus partidos (o fallaba por clave foránea a medias), y una liga sin
 * participantes ni respondía. Ahora es una transacción: si algo falla, no se borra
 * nada.
 *
 * DELETE /leagues/delete/:id → { deleted: { partidos: 46, predicciones: 552, … } }
 */
exports.deleteLeague = async (req, res) => {
    try {
        const league = await League.findByPk(req.params.id);
        if (!league) {
            return res.status(404).json({ error: 'League not found' });
        }

        const deleted = await sequelize.transaction(async (transaction) => {
            const counts = {};
            for (const [what, sql] of LEAGUE_CASCADE) {
                const [, meta] = await sequelize.query(sql, { replacements: { id: league.id }, transaction });
                counts[what] = meta?.rowCount ?? 0;
            }
            await league.destroy({ transaction });
            return counts;
        });

        res.json({ deleted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};