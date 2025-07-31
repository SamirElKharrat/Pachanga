import React, { useEffect, useState } from 'react';
import { Image } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { API } from '../../services/api';
import { showAlert } from './AlertInfo';

const LeagueInfo = ({ leagueId }) => {
    const [league, setLeague] = useState(null);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const nav = useNavigate();

    useEffect(() => {
        const fetchLeagueData = async () => {
            try {
                const leagueRes = await API.get(`/leagues/get/${leagueId}`);
                setLeague(leagueRes);

                const teamsRes = await API.get(`/leagues/getTeams/${leagueId}`);
                const teamPromises = teamsRes.Teams.map(team =>
                    API.get(`/teams/get/${team.value}`)
                );
                const teamsData = await Promise.all(teamPromises);
                setTeams(teamsData);

                const playersRes = await API.get(`/leagueParticipations/get/participants/${leagueId}`);
                const playerPromises = playersRes.map(participation =>
                    API.get(`/users/get/${participation.user_id}`)
                );
                const playersData = await Promise.all(playerPromises);
                setPlayers(playersData);
            } catch (error) {
                console.error(error);
                showAlert('error', "Error al cargar los datos de la liga");
            }
        };

        fetchLeagueData();
    }, [leagueId]);

    if (!league) return <div className="text-center mt-5">Loading...</div>;

    return (
        <div className="container my-5">

            {/* Botón flotante para volver */}
            <button
                type="button"
                className="btn btn-primary rounded-circle position-fixed"
                style={{ bottom: '24px', right: '24px', width: '56px', height: '56px', zIndex: 1050 }}
                onClick={() => nav('/leagues')}
                aria-label="Volver"
            >
                <ArrowLeftOutlined style={{ fontSize: '24px' }} />
            </button>

            {/* Card principal */}
            <div className="card shadow rounded-3 p-4">

                {/* Header: logo + nombre */}
                <div className="d-flex align-items-center mb-4">
                    <Image
                        src={league.logo_url}
                        alt={league.name}
                        preview={false}
                        style={{ width: '100px', height: 'auto', objectFit: 'contain' }}
                        className="me-4"
                    />
                    <h2 className="mb-0">{league.name}</h2>
                </div>

                <hr />

                {/* Contenido en dos columnas responsive */}
                <div className="row gy-4">
                    {/* Equipos */}
                    <div className="col-12 col-md-6">
                        <h4>Equipos Participantes</h4>
                        <div className="row g-3 mt-2">
                            {teams.map((team) => (
                                <div key={team.id} className="col-6 col-sm-4 col-lg-3">
                                    <div
                                        className="card h-100 border-0 shadow-sm text-center p-3"
                                        style={{ borderRadius: '12px', cursor: 'default' }}
                                        title={team.name}
                                    >
                                        <Image
                                            src={team.logo_url}
                                            alt={team.name}
                                            preview={false}
                                            style={{ width: '60px', height: '60px', objectFit: 'contain', margin: '0 auto 0.5rem' }}
                                        />
                                        <div className="text-truncate" style={{ fontWeight: '600' }}>{team.name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Jugadores */}
                    <div className="col-12 col-md-6">
                        <h4>Jugadores</h4>
                        <div className="row g-3 mt-2">
                            {players.map((player) => (
                                <div key={player.id} className="col-6 col-sm-4 col-lg-3">
                                    <div
                                        className="card h-100 border-0 shadow-sm text-center p-3"
                                        style={{ borderRadius: '12px', cursor: 'default' }}
                                        title={player.username}
                                    >
                                        <Image
                                            src={player.logo_url}
                                            alt={player.username}
                                            preview={false}
                                            style={{ width: '60px', height: '60px', objectFit: 'cover', margin: '0 auto 0.5rem', borderRadius: '50%' }}
                                        />
                                        <div className="text-truncate" style={{ fontWeight: '600' }}>{player.username}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LeagueInfo;
