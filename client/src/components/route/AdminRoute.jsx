import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../../services/api';
import { Outlet } from 'react-router-dom';

const AdminRoute = () => {
    const [isAdmin, setIsAdmin] = useState(null);
    const nav = useNavigate();

    useEffect(() => {
        if (isAdmin == null) {
            API.get('/users/admin')
                .then((data) => {
                    nav('/admin', { state: { isAdmin: true } })
                    setIsAdmin(data);
                })
                .catch(() => {
                    nav('/', { state: { error: "The Token has expired, login to get a new one" } })
                })
        }

    }, [isAdmin, nav]);

    return isAdmin ? <Outlet /> : null

}

export default AdminRoute
