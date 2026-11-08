import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { API } from '../../services/api';
import { loginPath } from '../../utils/loginRedirect';

/**
 * Las rutas que piden sesión.
 *
 * `access`: 'checking' → 'allowed'. Si la sesión no vale no hay tercer estado: se
 * redirige al login, que vuelve aquí al entrar. Antes esto guardaba el propio
 * `<Outlet />` en el estado, y «null» quería decir a la vez «comprobando» y «fuera».
 *
 * Las dos comprobaciones se hacen una vez, al montarse. Este componente envuelve a
 * todas las páginas, así que no se desmonta al navegar; solo al cerrar sesión, que
 * lleva al login y al volver lo monta de nuevo.
 */
const ProtectedRoute = () => {
    /** @type {['checking'|'allowed', Function]} */
    const [access, setAccess] = useState('checking');
    const nav = useNavigate();
    const location = useLocation();

    // Dónde está el usuario cuando llega la respuesta, no dónde estaba al pedirla:
    // si navega mientras tanto, la redirección no debe devolverle atrás.
    const locationRef = useRef(location);
    useEffect(() => { locationRef.current = location; }, [location]);
    // `useNavigate` devuelve una función nueva en cada cambio de ruta; como
    // dependencia, repetiría las dos comprobaciones en cada navegación.
    const navRef = useRef(nav);
    useEffect(() => { navRef.current = nav; }, [nav]);

    useEffect(() => {
        let cancelled = false;

        API.get('/users/protected')
            .then(() => { if (!cancelled) setAccess('allowed'); })
            .catch(() => {
                if (!cancelled) {
                    navRef.current(loginPath(locationRef.current), { state: { error: "The Token has expired, login to get a new one" } });
                }
            });

        API.get('/users/admin')
            .then(() => {
                if (cancelled || localStorage.getItem('admin')) return;
                localStorage.setItem('admin', true);
                // Hace falta re-renderizar para que salga el menú de administración,
                // porque lo de arriba es localStorage y no estado. Antes esto era
                // nav('/'), que además se llevaba por delante la URL que hubieras
                // abierto: un enlace a una ficha o a una comparación concreta acababa
                // en la portada la primera vez que entrabas desde un navegador nuevo.
                const here = locationRef.current;
                navRef.current(here.pathname + here.search, { replace: true });
            })
            .catch(() => {
                localStorage.removeItem('admin');
            });

        return () => { cancelled = true; };
    }, []);

    return access === 'allowed' ? <Outlet /> : null;
};

export default ProtectedRoute;
