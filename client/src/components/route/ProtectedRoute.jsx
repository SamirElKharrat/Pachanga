import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { API } from '../../services/api';
import { loginPath } from '../../utils/loginRedirect';

const ProtectedRoute = () => {
    const [isVerified, setIsVerified] = useState(null);
    const nav = useNavigate();
    const location = useLocation();
    const loginTarget = loginPath(location);

    useEffect(() => {
        if (isVerified == null) {
            API.get('/users/protected')
                .then(() => {
                    setIsVerified(<Outlet />);
                })
                .catch(() => {
                    nav(loginTarget, { state: { error: "The Token has expired, login to get a new one" } })
                })
        }

        API.get('/users/admin')
            .then(() => {
                if (!localStorage.getItem('admin')) {
                    localStorage.setItem('admin', true);
                    // Hace falta re-renderizar para que salga el menú de administración,
                    // porque lo de arriba es localStorage y no estado. Antes esto era
                    // nav('/'), que además se llevaba por delante la URL que hubieras
                    // abierto: un enlace a una ficha o a una comparación concreta acababa
                    // en la portada la primera vez que entrabas desde un navegador nuevo.
                    nav(location.pathname + location.search, { replace: true });
                }
            })
            .catch(() => {
                localStorage.removeItem('admin');
            })
    }, [isVerified, nav, location.pathname, location.search, loginTarget]);

    return isVerified

};

export default ProtectedRoute;