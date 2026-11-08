const { Op } = require('sequelize');
const League = require('../models/league');
const Match = require('../models/match');
const Result = require('../models/result');
const hallController = require('../controllers/hallController');
const pachangaController = require('../controllers/pachangaController');
const { startOfWeek } = require('../controllers/weekController');

/**
 * El ciclo de vida de ligas y partidos, en un solo sitio.
 *
 *     scheduled ──► live ──► finished
 *         └────────────────────▲
 *
 * Liga:    pasa a `live` al llegar `start_date` y a `finished` al pasar `end_date`.
 * Partido: pasa a `live` al llegar su hora y a `finished` en cuanto tiene resultado.
 *
 * Antes lo movían los navegadores: Inicio hacía un PUT por cada liga caducada y
 * NextGames uno por cada partido empezado. Una liga solo terminaba si alguien de
 * ella abría Inicio, y si lo abrían dos a la vez los dos la daban por terminada:
 * el reparto de títulos del Hall of Flame corría dos veces y salía repetido.
 *
 * Ahora el servidor es el único que avanza estados por su cuenta. Cada paso es un
 * UPDATE condicionado al estado de origen, así que de varias llamadas a la vez solo
 * una gana la transición, y solo esa dispara lo que conlleva (Hall y puntos de la
 * Pachanga). El panel de admin puede seguir poniendo cualquier estado a mano: esto
 * no lo impide, solo avanza lo que el calendario ya ha dejado atrás.
 */
const STATUS = Object.freeze({
    SCHEDULED: 'scheduled',
    LIVE: 'live',
    FINISHED: 'finished',
});

/**
 * El estado que le toca a una liga ahora. Misma regla que aplicaba Inicio.
 *
 * Una liga en `live` antes de su inicio (puesta a mano) se respeta: solo se avanza.
 *
 * @param {{status: string, start_date: Date|string, end_date: Date|string}} league
 * @param {Date} [now]
 * @returns {string}
 */
function leagueStatusAt(league, now = new Date()) {
    const start = new Date(league.start_date);
    const end = new Date(league.end_date);
    if (league.status === STATUS.SCHEDULED && now >= start && now <= end) return STATUS.LIVE;
    if (league.status !== STATUS.FINISHED && now > end) return STATUS.FINISHED;
    return league.status;
}

/**
 * Avanza las ligas que el calendario ha dejado atrás y, de las que acaban de
 * terminar, reparte Hall y puntos de la Pachanga.
 *
 * @param {Date} [now]
 * @returns {Promise<number[]>} Las ligas que han pasado a `finished` en esta llamada.
 */
async function advanceLeagues(now = new Date()) {
    const pending = await League.findAll({
        where: { status: { [Op.ne]: STATUS.FINISHED } },
        attributes: ['id', 'status', 'start_date', 'end_date'],
    });

    const justFinished = [];
    for (const league of pending) {
        const next = leagueStatusAt(league, now);
        if (next === league.status) continue;

        // Condicionado al estado leído: si otra llamada ya la ha movido, esta no
        // cuenta la transición y no repite sus efectos.
        const [moved] = await League.update(
            { status: next },
            { where: { id: league.id, status: league.status } }
        );
        if (moved === 1 && next === STATUS.FINISHED) justFinished.push(league.id);
    }

    if (justFinished.length > 0) {
        await hallController.syncFinishedLeagueWinners();
        for (const id of justFinished) {
            await pachangaController.syncFinishedLeaguePachangaPoints(id);
        }
    }
    return justFinished;
}

/**
 * Avanza los partidos: con resultado → `finished`; empezados esta semana → `live`.
 *
 * Lo de «esta semana» no es casual: es justo el conjunto que NextGames pasaba a
 * `live`. Un partido viejo que se quedó sin resultado no debe resucitar como «en
 * vivo», porque `/matches/getByWeek` devuelve todos los `live` sin mirar la fecha.
 *
 * @param {Date} [now]
 */
async function advanceMatches(now = new Date()) {
    const resolved = await Result.findAll({ attributes: ['match_id'], raw: true });
    const resolvedIds = resolved.map(r => r.match_id).filter(Boolean);
    if (resolvedIds.length > 0) {
        await Match.update(
            { status: STATUS.FINISHED },
            { where: { id: { [Op.in]: resolvedIds }, status: { [Op.ne]: STATUS.FINISHED } } }
        );
    }

    await Match.update(
        { status: STATUS.LIVE },
        {
            where: {
                status: STATUS.SCHEDULED,
                date: { [Op.gte]: startOfWeek(), [Op.lte]: now },
                ...(resolvedIds.length > 0 && { id: { [Op.notIn]: resolvedIds } }),
            },
        }
    );
}

// Una sola pasada a la vez dentro del proceso: si llega otra mientras corre, se
// engancha a la misma en vez de lanzar una segunda.
let inFlight = null;

/**
 * Avanza ligas y partidos. Nunca lanza: un fallo aquí no debe tumbar la petición
 * que lo ha provocado, solo dejar los estados para la siguiente pasada.
 *
 * @returns {Promise<void>}
 */
function advanceLifecycles() {
    if (inFlight) return inFlight;
    inFlight = (async () => {
        try {
            const now = new Date();
            await advanceMatches(now);
            await advanceLeagues(now);
        } catch (error) {
            console.error('[lifecycle] No se pudieron avanzar los estados:', error);
        } finally {
            inFlight = null;
        }
    })();
    return inFlight;
}

module.exports = {
    STATUS,
    leagueStatusAt,
    advanceLeagues,
    advanceMatches,
    advanceLifecycles,
};
