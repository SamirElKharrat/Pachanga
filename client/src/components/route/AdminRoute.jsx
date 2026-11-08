import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { API } from '../../services/api';

/**
 * Las rutas del panel de administración.
 *
 * `access`: 'checking' → 'allowed'. Sin permiso se manda a Inicio.
 *
 * Antes, al confirmar el permiso, hacía `nav('/admin')` estando ya en /admin: metía
 * una entrada repetida en el historial y el botón de atrás había que pulsarlo dos
 * veces para salir del panel.
 */
const AdminRoute = () => {
    /** @type {['checking'|'allowed', Function]} */
    const [access, setAccess] = useState('checking');
    const nav = useNavigate();

    useEffect(() => {
        let cancelled = false;
        API.get('/users/admin')
            .then(() => { if (!cancelled) setAccess('allowed'); })
            .catch(() => {
                if (!cancelled) nav('/', { replace: true, state: { error: "The Token has expired, login to get a new one" } });
            });
        return () => { cancelled = true; };
    }, [nav]);

    return access === 'allowed' ? <Outlet /> : null;
};

export default AdminRoute;
