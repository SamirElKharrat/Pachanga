import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { API } from '../../services/api';

const ProtectedRoute = () => {
    const [isVerified, setIsVerified] = useState(null);
    const nav = useNavigate();

    useEffect(() => {
        if (isVerified == null) {
            API.get('/users/protected')
                .then(() => {
                    setIsVerified(<Outlet />);
                })
                .catch(() => {
                    nav('/login', { state: { error: "The Token has expired, login to get a new one" } })
                })
        }

        API.get('/users/admin')
            .then(() => {
                if (!localStorage.getItem('admin')) {
                    localStorage.setItem('admin', true);
                    nav('/');
                }
            })
            .catch(() => {
                localStorage.removeItem('admin');
            })
    }, [isVerified, nav]);

    return isVerified

};

export default ProtectedRoute;