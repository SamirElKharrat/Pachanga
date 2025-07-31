import React from 'react'
import { Outlet } from 'react-router-dom'
import UserMenu from '../atoms/UserMenu';
import NextGames from '../atoms/NextGames';
import './css/layoutlet.css';

export default function Layoutlet() {

    return (
        <UserMenu>
            <NextGames />
            <Outlet />
        </UserMenu>
    );
}
