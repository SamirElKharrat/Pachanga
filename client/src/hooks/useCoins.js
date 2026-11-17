import { useEffect, useState } from 'react';
import { API } from '../services/api';
import { showAlert } from '../components/atoms/AlertInfo';

/**
 * Las monedas del usuario, compartidas por toda la web.
 *
 * Un solo almacén para el menú, la cabecera del móvil y el perfil: cuando algo
 * cambia el saldo (enviar la jornada, abrir la web por primera vez en el día), quien
 * lo cambió llama a `refreshCoins()` y todos se actualizan a la vez.
 *
 * `refreshCoins` también avisa de lo nuevo («+3 monedas · Jornada completa»). Para
 * no repetir avisos, recuerda en este navegador hasta qué movimiento ha avisado ya.
 * La primera vez en un navegador no avisa de nada: si no, alguien que llega con
 * veinte movimientos recibiría veinte avisos de golpe.
 */

/** @type {{status: 'idle'|'loading'|'ready'|'error', balance: number|null, cap: number, movements: Array<Object>}} */
let state = { status: 'idle', balance: null, cap: 150, movements: [], howToEarn: [] };
const listeners = new Set();
let inFlight = null;

const set = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach(fn => fn(state));
};

const seenKey = (userId) => `pachanga.coins.seen.${userId}`;
const readSeen = (userId) => {
    try {
        const v = localStorage.getItem(seenKey(userId));
        return v === null ? null : Number(v);
    } catch { return null; }
};
const writeSeen = (userId, id) => {
    try { localStorage.setItem(seenKey(userId), String(id)); } catch { /* sin almacenamiento: no pasa nada */ }
};

const MAX_TOASTS = 3;

/** Avisa de los movimientos nuevos desde la última vez, y apunta hasta dónde. */
function announce(wallet) {
    const lastId = wallet.movements.reduce((m, x) => Math.max(m, x.id), 0);
    const seen = readSeen(wallet.userId);
    writeSeen(wallet.userId, Math.max(lastId, seen ?? 0));
    if (seen === null) return;

    // Los de 0 son recompensas que llegaron con el techo lleno: no hay nada que celebrar.
    const fresh = wallet.movements.filter(m => m.id > seen && m.amount !== 0).reverse();
    fresh.slice(0, MAX_TOASTS).forEach(m => {
        const text = `${m.amount > 0 ? '+' : '−'}${Math.abs(m.amount)} ${Math.abs(m.amount) === 1 ? 'moneda' : 'monedas'} · ${m.label}`;
        showAlert(m.amount > 0 ? 'success' : 'warning', text);
    });
    if (fresh.length > MAX_TOASTS) showAlert('info', `Y ${fresh.length - MAX_TOASTS} movimientos más en tu perfil`);
}

/**
 * Vuelve a pedir el saldo. Varias llamadas a la vez comparten la misma petición.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.quiet] - No avisar de lo nuevo (sí lo marca como visto).
 * @returns {Promise<void>}
 */
export function refreshCoins({ quiet = false } = {}) {
    if (inFlight) return inFlight;
    if (state.status === 'idle') set({ status: 'loading' });
    inFlight = API.get('/coins/me')
        .then(wallet => {
            if (!wallet || typeof wallet.balance !== 'number') throw new Error('Respuesta sin saldo');
            if (!quiet) announce(wallet);
            else writeSeen(wallet.userId, wallet.movements.reduce((m, x) => Math.max(m, x.id), readSeen(wallet.userId) ?? 0));
            set({ status: 'ready', balance: wallet.balance, cap: wallet.cap, movements: wallet.movements, howToEarn: wallet.howToEarn || [] });
        })
        .catch(() => set({ status: state.balance === null ? 'error' : state.status }))
        .finally(() => { inFlight = null; });
    return inFlight;
}

/**
 * El saldo y los movimientos, siempre al día.
 *
 * @returns {{status: string, balance: number|null, cap: number, movements: Array<Object>}}
 */
export default function useCoins() {
    const [snapshot, setSnapshot] = useState(state);
    useEffect(() => {
        listeners.add(setSnapshot);
        setSnapshot(state);
        return () => listeners.delete(setSnapshot);
    }, []);
    return snapshot;
}
