import React from 'react';
import { useEquipped } from '../../../hooks/useCosmetics';
import { useTheme } from '../../../context/ThemeContext';
import '../css/cosmetics.css';

/**
 * Los cosméticos de la tienda, para pintarlos donde salga un jugador.
 *
 * Cada pieza mira lo que lleva puesto ese jugador (hooks/useCosmetics). Sin nada
 * puesto no añade nada, así que envolver un avatar o un nombre no cambia cómo se ve
 * para quien no ha comprado. Con `frame`, `color` o `title` se fuerza uno concreto
 * (la tienda, para enseñar cómo queda antes de comprar).
 */

/**
 * El marco del avatar: un aro alrededor de lo que envuelve.
 *
 * @param {Object} props
 * @param {number} [props.userId]
 * @param {string|null} [props.frame] - Forzar un marco (o `null` para ninguno).
 * @param {React.ReactNode} props.children - El avatar.
 */
export function CosmeticFrame({ userId, frame, children }) {
    const equipped = useEquipped(userId);
    const id = frame !== undefined ? frame : equipped.frame;
    if (!id) return children;
    return <span className={`cos-frame ${id}`}>{children}</span>;
}

/**
 * El nombre, con su color si lo tiene.
 *
 * @param {Object} props
 * @param {number} [props.userId]
 * @param {string|null} [props.color] - Forzar un color (o `null` para ninguno).
 * @param {React.ReactNode} props.children - El nombre.
 */
export function CosmeticName({ userId, color, children }) {
    const equipped = useEquipped(userId);
    const { isLightMode } = useTheme();
    const id = color !== undefined ? color : equipped.color;
    if (!id) return children;
    return <span className={`cos-name ${id}${isLightMode ? ' is-light' : ''}`}>{children}</span>;
}

/**
 * El título, debajo o al lado del nombre. Nada si no lleva.
 *
 * @param {Object} props
 * @param {number} [props.userId]
 * @param {string|null} [props.title] - Forzar un título por su texto.
 * @param {Object} [props.style]
 */
export function CosmeticTitle({ userId, title, style }) {
    const equipped = useEquipped(userId);
    const { isLightMode } = useTheme();
    const label = title !== undefined ? title : equipped.title?.label;
    if (!label) return null;
    return <span className={`cos-title${isLightMode ? ' is-light' : ''}`} style={style}>{label}</span>;
}
