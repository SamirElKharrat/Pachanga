/**
 * La ruta del login que, al entrar, devuelve a donde estabas.
 *
 * @param {{pathname: string, search?: string}} location
 * @returns {string}
 */
export function loginPath(location) {
    const target = location.pathname + (location.search || '');
    return target === '/' ? '/login' : `/login?next=${encodeURIComponent(target)}`;
}

/**
 * El destino tras iniciar sesión, solo si es una ruta de esta web.
 *
 * `next` llega por la URL, así que cualquiera puede escribir lo que quiera. Sin
 * esta comprobación, un enlace a `/login?next=https://otra.web` serviría para
 * mandar a alguien fuera justo después de meter su contraseña.
 *
 * @param {string|null} raw
 * @returns {string}
 */
export function safeNext(raw) {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
    return raw;
}
