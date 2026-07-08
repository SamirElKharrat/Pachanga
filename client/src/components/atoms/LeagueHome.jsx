import React, { useEffect, useState } from 'react';
import CardInfo from './CardInfo';
import YearFilter from './YearFilter';
import { API } from '../../services/api';
import { Row, Col, Tooltip, Typography, Image, Skeleton, Space, Empty } from 'antd';
import ModalInfo from './ModalInfo';
import { useNavigate } from 'react-router-dom';
import { showAlert } from './AlertInfo';
import { Card } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * Component for exploring available leagues and joining them.
 * 
 * @returns {React.ReactElement} The LeagueHome component.
 */
const LeagueHome = () => {
    const [leagues, setLeagues] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [selectedLeague, setSelectedLeague] = useState(null);
    const [user, setUser] = useState(null);
    const [joinedLeagues, setJoinedLeagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const nav = useNavigate();

    /**
     * Loads initial data for leagues and user participation.
     */
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const currentUser = await API.getUserByToken();
                setUser(currentUser);

                const [participations, allLeagues] = await Promise.all([
                    API.get('/leagueParticipations/get/'),
                    API.get('/leagues/get')
                ]);

                setJoinedLeagues(participations);
                setLeagues(allLeagues);
            } catch (error) {
                console.error("Error loading leagues:", error);
                //showAlert('error', "No se pudieron cargar las ligas");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    /**
     * Handles the logic for a user wanting to join a league.
     * @param {Object} league - The league object to join.
     */
    const handleJoinLeague = async (league) => {
        try {
            const res = await API.get(`/leagues/getTeams/${league.id}`);
            const teamPromises = res.Teams.map(team => API.get(`/teams/get/${team.value}`));
            const resTeams = await Promise.all(teamPromises);

            setTeams(resTeams);
            setSelectedLeague(league);
            setOpenModal(true);
        } catch (e) {
            console.error(e);
            showAlert('error', "Error al cargar los equipos de la liga");
        }
    };

    /**
     * Finalizes the league joining process.
     */
    const handleSuccess = async () => {
        if (!selectedTeam) {
            showAlert('error', "Debes seleccionar un equipo favorito");
            return;
        }

        try {
            await Promise.all([
                API.post('/favoriteTeams/set', {
                    user_id: user.id,
                    team_id: selectedTeam,
                    league_id: selectedLeague.id
                }),
                API.post('/leagueParticipations/join', {
                    user_id: user.id,
                    league_id: selectedLeague.id,
                })
            ]);

            showAlert('success', "¡Bienvenido a la liga!");
            setOpenModal(false);
            nav(`/`, { state: { leagueId: selectedLeague.id } });
        } catch (error) {
            console.error("Error joining league:", error);
            showAlert('error', "Hubo un problema al unirte a la liga");
        }
    };

    const filteredLeagues = selectedYear
        ? leagues.filter(l => new Date(l.start_date).getFullYear() === selectedYear).sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
        : leagues.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

    const handleYearChange = (year) => {
        setSelectedYear(year);
    };

    return (
        <div className="p-3" style={{ width: '100%' }}>
            <Title level={2} style={{ color: '#f8fafc', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 24 }}>
                Explorar Ligas
            </Title>

            {!loading && leagues.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <YearFilter
                        leagues={leagues}
                        selectedYear={selectedYear}
                        onYearChange={handleYearChange}
                    />
                </div>
            )}

            {loading ? (
                <Row gutter={[24, 24]}>
                    {[1, 2, 3].map(i => (
                        <Col key={i} xs={24} sm={12} md={12} lg={8} xl={6}>
                            <Card className="shadow-sm" style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.02)' }}>
                                <Skeleton active avatar paragraph={{ rows: 3 }} />
                            </Card>
                        </Col>
                    ))}
                </Row>
            ) : filteredLeagues.length > 0 ? (
                <Row gutter={[24, 24]}>
                    {filteredLeagues.map((league) => {
                        const isJoined = joinedLeagues.some(p => p.league_id === league.id);
                        return (
                            <Col key={league.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                                <CardInfo
                                    title={league.name}
                                    image={league.logo_url}
                                    date={{
                                        dates: [league.start_date, league.end_date]
                                    }}
                                    onAction={() => isJoined ? nav(`/leagues/${league.id}`) : handleJoinLeague(league)}
                                    actionText={isJoined ? "Ver Liga" : "Unirse ahora"}
                                />
                            </Col>
                        );
                    })}
                </Row>
            ) : (
                <Empty description="No hay ligas disponibles en este momento." />
            )}

            <ModalInfo
                open={openModal}
                okText="Unirse ahora"
                cancelText="Cancelar"
                title="Selecciona tu equipo favorito"
                description={
                    <div>
                        <Text type="secondary" className="mb-4 d-block">
                            Para unirte a <strong>{selectedLeague?.name}</strong>, elige el equipo al que apoyarás.
                        </Text>
                        <Row gutter={[16, 16]} className="justify-content-center">
                            {teams.map((team) => (
                                <Col key={team.id} xs={8} sm={6} md={4}>
                                    <Tooltip title={team.name}>
                                        <div
                                            className="text-center p-2 rounded cursor-pointer transition-all"
                                            style={{
                                                borderRadius: 8,
                                                boxShadow: selectedTeam === team.id ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none',
                                                background: selectedTeam === team.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                border: selectedTeam === team.id ? '1px solid #3b82f6' : '1px solid transparent'
                                            }}
                                            onClick={() => setSelectedTeam(selectedTeam === team.id ? null : team.id)}
                                        >
                                            <Image
                                                src={team.logo_url}
                                                alt={team.name}
                                                preview={false}
                                                width={60}
                                                height={60}
                                                style={{ objectFit: 'contain', pointerEvents: 'none' }}
                                            />
                                        </div>
                                    </Tooltip>
                                </Col>
                            ))}
                        </Row>
                    </div>
                }
                onSuccess={handleSuccess}
                onClose={() => setOpenModal(false)}
            />
        </div>
    );
};

export default LeagueHome;