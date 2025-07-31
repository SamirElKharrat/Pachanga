import React from 'react';
import LeagueHome from '../atoms/LeagueHome';
import { useParams } from 'react-router-dom';
import LeagueInfo from '../atoms/LeagueInfo';

const League = () => {
    let { id } = useParams();

    if (!id) {
        return (
            <LeagueHome />
        );
    }
    else {
        return (
            <LeagueInfo leagueId={id} />
        );
    }
};

export default League;