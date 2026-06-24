import React from 'react';
import LeagueHome from '../atoms/LeagueHome';
import { useParams } from 'react-router-dom';
import LeagueInfo from '../atoms/LeagueInfo';
import { Flex } from 'antd';

/**
 * League wrapper component that determines whether to show the league listing or specific league info.
 * 
 * @returns {React.ReactElement} The League listing or details view.
 */
const League = () => {
    let { id } = useParams();

    if (!id) {
        return (
            <Flex vertical style={{ padding: 12, width: '100%' }}>
                <LeagueHome />
            </Flex>
        );
    }

    return (
        <Flex vertical style={{ padding: 12, width: '100%' }}>
            <LeagueInfo leagueId={id} />
        </Flex>
    );
};

export default League;