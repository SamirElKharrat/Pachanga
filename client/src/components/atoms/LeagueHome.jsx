import React, { useEffect, useState } from 'react';
import CardInfo from './CardInfo';
import { API } from '../../services/api';
import { Card } from 'antd';
import { Row, Col, Tooltip } from 'antd';
import ModalInfo from './ModalInfo';
import { Image } from 'antd';
import { useNavigate } from 'react-router-dom';
import { showAlert } from './AlertInfo';

const LeagueHome = () => {
    const [leagues, setLeagues] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [selectedLeague, setSelectedLeague] = useState(null);
    const [user, setUser] = useState(null);
    const [joinedLeagues, setJoinedLeagues] = useState([]);
    const nav = useNavigate();

    useEffect(() => {
        API.getUserByToken().then(res => {
            setUser(res);
            API.get(`/leagueParticipations/get/`).then(res => {
                setJoinedLeagues(res);
            }).catch(() => {
                showAlert('error', "Error al cargar las ligas");
            })
        }).catch(() => {
            showAlert('error', "Error al cargar los datos del usuario");
        })
        API.get('/leagues/get').then(res => {
            setLeagues(res);
        }).catch(() => {
            showAlert('error', "Error al cargar las ligas");
        })

    }, []);

    const handleJoinLeague = async (league) => {
        try {
            const res = await API.get(`/leagues/getTeams/${league.id}`);
            const teamPromises = res.Teams.map(team =>
                API.get(`/teams/get/${team.value}`)
            );
            const resTeams = await Promise.all(teamPromises);
            setOpenModal(true);
            setTeams(resTeams);
            setSelectedLeague(league);
        } catch (e) {
            console.error(e);
            showAlert('error', "Error al cargar los equipos");
        }
    }

    const handleSuccess = () => {
        if (!selectedTeam) {
            showAlert('error', "Debes seleccionar un equipo");
            return;
        }
        API.post('/favoriteTeams/set', {
            user_id: user.id,
            team_id: selectedTeam,
            league_id: selectedLeague.id
        }).then(() => {
            showAlert('success', "Unido a la Liga");
        }).catch(() => {
            showAlert('error', "Error al unirte a la liga");
        })

        API.post('/leagueParticipations/join', {
            user_id: user.id,
            league_id: selectedLeague.id,
        }).then(() => {
            setOpenModal(false);
            nav(`/`, { state: { leagueId: selectedLeague.id } });
        }).catch(() => {
            showAlert('error', "Error al unirte a la liga");
        })
    }

    return (
        <div className='container mt-5'>

            <Row gutter={[16, 16]}>
                {leagues.map((league, index) => (
                    <Col key={index} xs={24} md={8}>
                        <CardInfo
                            title={league.name}
                            image={league.logo_url}
                            date={{
                                count: 2,
                                dates: [league.start_date, league.end_date]
                            }}
                            onAction={() => {
                                if (joinedLeagues.some(participation => participation.league_id === league.id)) {
                                    nav(`/leagues/${league.id}`);
                                } else {
                                    handleJoinLeague(league);
                                }
                            }}
                            actionText={joinedLeagues.some(participation => participation.league_id === league.id) ? "Ver la Liga" : "Unirse a la Liga"}
                        />
                    </Col>
                ))}
            </Row>

            <ModalInfo
                open={openModal}
                okText="Unirse"
                cancelText="Cancelar"
                title="Elige un equipo favorito antes de unirte a la liga"
                description={
                    teams.length > 0 ? (
                        <Row gutter={[16, 0]}>
                            {teams.map((team, index) => (
                                <Col key={index} xs={24} sm={12} md={8} lg={6}>
                                    <div className="team-container" style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        padding: '8px'
                                    }}>
                                        <Tooltip title={team.name} placement="bottom">
                                            <Image
                                                height={50}
                                                width={50}
                                                src={team.logo_url}
                                                alt={team.name}
                                                preview={false}
                                                value={team.id}
                                                style={{
                                                    border: selectedTeam === team.id ? '3px solid black' : 'none',
                                                    borderRadius: '5px',
                                                    padding: '5px',
                                                }}
                                                onClick={() => {
                                                    if (selectedTeam === team.id) {
                                                        setSelectedTeam(null);
                                                    } else {
                                                        setSelectedTeam(team.id);
                                                    }
                                                }}
                                            />
                                        </Tooltip>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    ) : (
                        "No hay equipos"
                    )
                }
                onSuccess={() => {
                    handleSuccess();
                }}
                onClose={() => {
                    setOpenModal(false);
                }}
            />
        </div>
    );
};

export default LeagueHome;