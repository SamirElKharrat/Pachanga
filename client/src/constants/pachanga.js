/**
 * Valores de la Pachanga que comparten Inicio y la portada.
 *
 * Viven aquí y no en Home.jsx para que la portada pinte las predicciones y el podio
 * exactamente igual que dentro de la web sin copiar nada.
 */

/** Colores de cada estado de una predicción en la rejilla de Inicio. */
export const STATUS_COLORS = {
    pending: { bg: 'rgba(var(--tint), 0.05)', border: 'rgba(var(--tint), 0.12)', text: 'var(--text-dim)' },
    correct: { bg: 'rgba(var(--success-rgb), 0.12)', border: 'rgba(var(--success-rgb), 0.35)', text: 'var(--success)' },
    partial: { bg: 'rgba(var(--pred-acierto-rgb), 0.12)', border: 'rgba(var(--pred-acierto-rgb), 0.35)', text: 'var(--pred-acierto)' },
    wrong: { bg: 'rgba(var(--danger-rgb), 0.12)', border: 'rgba(var(--danger-rgb), 0.35)', text: 'var(--danger)' },
};

// Colores del puesto en la clasificación lateral. El resplandor es el mismo tono
// al 33 % — que es lo que valía el `55` hexadecimal que se concatenaba antes.
export const RANK_STYLES = {
    1: { bg: 'var(--warning-light)', glow: 'rgba(var(--warning-light-rgb), 0.333)' },
    2: { bg: 'var(--text-dim)',      glow: 'rgba(var(--text-dim-rgb), 0.333)' },
    3: { bg: 'var(--warning-deep)',  glow: 'rgba(var(--warning-deep-rgb), 0.333)' },
    default: { bg: 'var(--bg-elevated)', glow: null },
};

/**
 * El id de usuario de Guille. Lo usan ¿Está ganando Guille? y la opción
 * «Guillen't», que a él no le deja quitar las ranas.
 */
export const GUILLE_ID = 27;

/** Lo que vale acertar una pregunta. Igual que QUESTION_POINTS en el servidor. */
export const QUESTION_POINTS = 4;

/**
 * Lo que vale cada acierto en un partido, tal como lo cuenta la portada.
 *
 * El cálculo de verdad está en server/utils/pointsCalculator.js
 * (calculatePredictionBreakdown y plenoBonus). Si cambia allí, hay que cambiarlo aquí.
 */
export const MATCH_POINTS = {
    winner: 2,
    exactBO3: 3,
    exactBO5: 5,
    favoriteOnExact: 1,
    // Plenos en la misma semana: 3 → +1, 5 → +2, 6 o más → +3.
    streak: [{ length: 3, bonus: 1 }, { length: 5, bonus: 2 }, { length: 6, bonus: 3 }],
};
