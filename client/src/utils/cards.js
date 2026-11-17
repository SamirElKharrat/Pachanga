import { API } from '../services/api';
import { showAlert } from '../components/atoms/AlertInfo';

/**
 * Ayudas de las cartas para el cliente. Las reglas viven en el servidor
 * (server/utils/cards.js): aquí solo se pinta lo que llega.
 */

/** Lo que ha valido una jugada, en texto, con su clase para pintarla. */
export function effectText(effect) {
    if (effect === null || effect === undefined) return { text: 'Pendiente', cls: 'pending' };
    if (effect === 0) return { text: '0', cls: 'zero' };
    return { text: `${effect > 0 ? '+' : '−'}${Math.abs(effect)}`, cls: effect > 0 ? 'up' : 'down' };
}

/** «G2 vs FNC», a partir de un partido con sus Teams. */
export const matchName = (match) => (match?.Teams?.length === 2
    ? `${match.Teams[0].acronym || match.Teams[0].name} vs ${match.Teams[1].acronym || match.Teams[1].name}`
    : match?.name || 'Partido');

/** Si un partido ya ha empezado: lo mismo que mira el servidor para bloquear cartas. */
export const matchStarted = (match, now = new Date()) =>
    !match || match.status !== 'scheduled' || new Date(match.date) <= now;

/**
 * Avisa de las cartas gratis que acaban de llegar (las de los últimos minutos). Se
 * llama al enviar la jornada, que es cuando llegan.
 *
 * @param {number} leagueId
 */
export async function announceFreeCards(leagueId) {
    try {
        const hand = await API.get(`/cards/hand/${leagueId}`);
        if (!hand?.enabled) return;
        const recent = (hand.hand || []).filter(c => c.source === 'free' && Date.now() - new Date(c.created_at).getTime() < 3 * 60 * 1000);
        recent.forEach(c => showAlert('success', `Carta gratis por la jornada completa: ${c.label}`));
    } catch {
        // Sin cartas o sin liga: no hay nada que avisar.
    }
}

/** El nombre de cada rareza, como se enseña en la carta. */
export const RARITY_LABEL = {
    comun: 'Común',
    poco: 'Poco común',
    raro: 'Rara',
    epico: 'Épica',
    leg: 'Legendaria',
};
