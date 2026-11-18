import { useEffect, useState } from 'react';
import { API } from '../services/api';

/**
 * Lo que lleva puesto cada jugador (marco, color de nombre y título), compartido por
 * toda la web: `{ [userId]: { frame, color, title: { id, label } } }`.
 *
 * Se pide una vez, la primera vez que algo lo usa, y la tienda llama a
 * `refreshCosmetics()` al ponerse o quitarse algo para que se vea al momento en el
 * menú, la clasificación y el Hall of Flame.
 */

let state = { status: 'idle', map: {} };
const listeners = new Set();
let inFlight = null;

const set = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach(fn => fn(state));
};

/** Vuelve a pedir lo que lleva puesto cada uno. Varias llamadas a la vez comparten petición. */
export function refreshCosmetics() {
    if (inFlight) return inFlight;
    if (state.status === 'idle') set({ status: 'loading' });
    inFlight = API.get('/shop/equipped')
        .then(map => set({ status: 'ready', map: map && typeof map === 'object' ? map : {} }))
        .catch(() => set({ status: 'error' }))
        .finally(() => { inFlight = null; });
    return inFlight;
}

/**
 * Los cosméticos puestos de todos.
 *
 * @returns {{status: string, map: Object}}
 */
export default function useCosmetics() {
    const [snapshot, setSnapshot] = useState(state);
    useEffect(() => {
        listeners.add(setSnapshot);
        setSnapshot(state);
        if (state.status === 'idle') refreshCosmetics();
        return () => listeners.delete(setSnapshot);
    }, []);
    return snapshot;
}

/**
 * Lo que lleva puesto un jugador.
 *
 * @param {number} userId
 * @returns {{frame?: string, color?: string, title?: {id: string, label: string}}}
 */
export function useEquipped(userId) {
    const { map } = useCosmetics();
    return (userId != null && map[userId]) || {};
}
