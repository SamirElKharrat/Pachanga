import { API } from '../services/api';

/**
 * Las jornadas de una liga, tal como las usan Inicio y Predicciones.
 *
 * Vienen de GET /rounds/league/:id (server/utils/rounds.js). Se adaptan a la forma
 * que tenían las «semanas» para no reescribir las dos pantallas: `id` es el `order`
 * de la jornada —el número que usan la clasificación por jornada y las preguntas—,
 * `roundId` es su id de verdad, y `name` es su nombre («Jornada 3», «Final»).
 *
 * @param {number} leagueId
 * @returns {Promise<Array<Object>>}
 */
export async function fetchLeagueRounds(leagueId) {
    const rounds = await API.get(`/rounds/league/${leagueId}`);
    return rounds.map(r => ({ ...r, id: r.order, roundId: r.id, name: r.label }));
}

/**
 * La jornada que se abre por defecto: la actual (la última que ya ha empezado), y
 * si ninguna lo marca, la última.
 *
 * @param {Array<Object>} rounds - De fetchLeagueRounds.
 * @returns {Object|undefined}
 */
export const defaultRound = (rounds) => rounds.find(r => r.current) || rounds[rounds.length - 1];

/**
 * Las fases que tiene una liga, en el orden en que aparecen.
 *
 * @param {Array<Object>} rounds
 * @returns {Array<{key: string, label: string}>}
 */
export function stagesOf(rounds) {
    const seen = new Map();
    rounds.forEach(r => { if (!seen.has(r.stage)) seen.set(r.stage, r.stageLabel); });
    return [...seen.entries()].map(([key, label]) => ({ key, label }));
}

/**
 * A qué jornada ir al cambiar de fase: la actual si es de esa fase; si no, la última
 * de esa fase que ya ha empezado; si no ha empezado ninguna, la primera.
 *
 * @param {Array<Object>} rounds
 * @param {string} stage
 * @returns {Object|undefined}
 */
export function roundForStage(rounds, stage) {
    const inStage = rounds.filter(r => r.stage === stage);
    return inStage.find(r => r.current)
        || [...inStage].reverse().find(r => r.status !== 'scheduled')
        || inStage[0];
}
