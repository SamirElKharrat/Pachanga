import React from 'react';
import LeagueHome from '../atoms/LeagueHome';
import { useParams } from 'react-router-dom';
import LeagueInfo from '../atoms/LeagueInfo';

/**
 * League wrapper component that determines whether to show the league listing or specific league info.
 * 
 * @returns {React.ReactElement} The League listing or details view.
 */
const League = () => {
    let { id } = useParams();

    if (!id) {
        return (
            <div className="p-3">
                <LeagueHome />
            </div>
        );
    }

    return (
        <div className="p-3">
            <LeagueInfo leagueId={id} />
        </div>
    );
};

export default League;