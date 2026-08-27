/**
 * Qué tema toca. Función pura, sin React y sin `window`, para que la regla de
 * precedencia se pueda leer de un vistazo y probar sin montar la aplicación.
 *
 * Precedencia, de más fuerte a más débil:
 *
 *   1. Worlds        hay mundial en curso y no lo ha apagado
 *   2. su preferencia claro / oscuro / sistema, como siempre
 *
 * Worlds va por encima de la preferencia y no al revés a propósito: es un tema
 * de temporada que debe aparecer solo, sin que nadie tenga que ir a Opciones.
 * Por eso mismo `worldsOptOut` existe — para poder salirse.
 *
 * @param {Object}  s
 * @param {boolean} s.hayWorlds        el servidor dice que el mundial está vivo
 * @param {boolean} s.worldsOptOut     el usuario lo ha apagado en Opciones
 * @param {'system'|'light'|'dark'} s.themePreference
 * @param {boolean} s.prefiereOscuro   lo que dice el sistema operativo
 * @returns {'worlds'|'light'|'dark'}
 */
export function resolveTheme({
    hayWorlds = false,
    worldsOptOut = false,
    themePreference = 'system',
    prefiereOscuro = true,
} = {}) {
    if (hayWorlds && !worldsOptOut) return 'worlds';
    if (themePreference === 'light') return 'light';
    if (themePreference === 'dark') return 'dark';
    return prefiereOscuro ? 'dark' : 'light';
}
