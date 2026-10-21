import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { API } from '../../services/api';
import Layoutlet from '../molecules/layoutlet';
import Landing from '../molecules/Landing';
import { loginPath } from '../../utils/loginRedirect';

/**
 * La puerta de toda la web.
 *
 * Con sesión, la web de siempre. Sin sesión, la portada si se entra por `/`, y el
 * login en cualquier otra ruta, que al entrar te devuelve a ella.
 *
 * Decide ANTES de montar el Layoutlet: el menú lateral pide el usuario nada más
 * montarse y, sin sesión, saltaría el aviso de «Sesión expirada» a alguien que
 * no ha entrado nunca.
 */
export default function SessionGate() {
    const [session, setSession] = useState('checking');
    const location = useLocation();

    useEffect(() => {
        let cancelled = false;
        API.get('/users/protected')
            .then(() => { if (!cancelled) setSession('in'); })
            .catch(() => { if (!cancelled) setSession('out'); });
        return () => { cancelled = true; };
    }, []);

    if (session === 'checking') return null;
    if (session === 'in') return <Layoutlet />;
    if (location.pathname === '/') return <Landing />;
    return <Navigate to={loginPath(location)} replace />;
}
