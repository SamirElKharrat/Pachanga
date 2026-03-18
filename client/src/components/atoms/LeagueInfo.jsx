import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Image, Typography, Space, Button, Avatar, List, Tag, Divider, Skeleton } from 'antd';
import { ArrowLeftOutlined, TeamOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { API } from '../../services/api';
import { showAlert } from './AlertInfo';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

const { Title, Text } = Typography;

/**
 * Component for viewing detailed information about a specific league.
 * 
 * @param {Object} props - Component props.
 * @param {string|number} props.leagueId - The ID of the league to display.
 * @returns {React.ReactElement} The LeagueInfo component.
 */
const LeagueInfo = ({ leagueId }) => {
    const [league, setLeague] = useState(null);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const nav = useNavigate();
    const { getAvatarSrc } = useAppTheme();

    /**
     * Fetches all data related to the league.
     */
    useEffect(() => {
        const fetchLeagueData = async () => {
            try {
                setLoading(true);
                const leagueRes = await API.get(`/leagues/get/${leagueId}`);
                setLeague(leagueRes);

                const [teamsRes, playersRes] = await Promise.all([
                    API.get(`/leagues/getTeams/${leagueId}`),
                    API.get(`/leagueParticipations/get/participants/${leagueId}`)
                ]);

                const teamPromises = teamsRes.Teams.map(team => API.get(`/teams/get/${team.value}`));
                const teamsData = await Promise.all(teamPromises);
                setTeams(teamsData);

                const playerPromises = playersRes.map(participation => API.get(`/users/get/${participation.user_id}`));
                const playersData = await Promise.all(playerPromises);
                setPlayers(playersData);
            } catch (error) {
                console.error("Error loading league details:", error);
                showAlert('error', "No se pudieron cargar los detalles de la liga");
            } finally {
                setLoading(false);
            }
        };

        fetchLeagueData();
    }, [leagueId]);

    if (loading && !league) {
        return <div className="p-3"><Skeleton active avatar paragraph={{ rows: 10 }} /></div>;
    }

    if (!league) return <div className="p-3 text-center"><Text type="secondary">Liga no encontrada.</Text></div>;

    return (
        <div className="p-3">
            <div className="d-flex align-items-center mb-4 gap-3">
                <Button 
                    shape="circle" 
                    icon={<ArrowLeftOutlined />} 
                    onClick={() => nav('/leagues')} 
                />
                <Title level={2} className="m-0">Detalles de la Liga</Title>
            </div>

            <Card className="shadow-sm mb-4">
                <Row gutter={[32, 32]} align="middle">
                    <Col xs={24} md={6} className="text-center text-md-start">
                        <Image
                            src={league.logo_url}
                            alt={league.name}
                            preview={false}
                            style={{ maxWidth: 150, height: 'auto', objectFit: 'contain' }}
                        />
                    </Col>
                    <Col xs={24} md={18}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Title level={3}>{league.name}</Title>
                            <Space>
                                <Button size="small">Reglas</Button>
                                <Button size="small">Estadísticas</Button>
                            </Space>
                        </div>
                        <Space direction="vertical" size="small">
                            <Space>
                                <CalendarOutlined className="text-primary d-none d-sm-inline" />
                                <Text strong className="d-none d-sm-inline">Duración:</Text>
                                <Tag color="blue" bordered={false}>{new Date(league.start_date).toLocaleDateString()}</Tag>
                                <Text type="secondary">-</Text>
                                <Tag color="blue" bordered={false}>{new Date(league.end_date).toLocaleDateString()}</Tag>
                            </Space>
                            <Space className="mt-2">
                                <TeamOutlined className="text-success" />
                                <Text strong>{teams.length} Equipos Participantes</Text>
                            </Space>
                            <Space>
                                <UserOutlined className="text-warning" />
                                <Text strong>{players.length} Jugadores Unidos</Text>
                            </Space>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                    <Card title={<Space><TeamOutlined /><span>Equipos</span></Space>} className="shadow-sm">
                        <List
                            grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 3, xl: 4 }}
                            dataSource={teams}
                            renderItem={team => (
                                <List.Item>
                                    <Card 
                                        hoverable 
                                        size="small" 
                                        className="text-center"
                                        onClick={() => window.open("https://lol.fandom.com/wiki/" + team.name)}
                                    >
                                        <Avatar src={team.logo_url} shape="square" size={48} className="mb-2" />
                                        <div className="text-truncate" style={{ fontSize: 12, fontWeight: 600 }}>{team.name}</div>
                                    </Card>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title={<Space><UserOutlined /><span>Jugadores</span></Space>} className="shadow-sm">
                        <List
                            grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 3, xl: 4 }}
                            dataSource={players}
                            renderItem={player => (
                                <List.Item>
                                    <div 
                                        className="text-center p-2 rounded hover-bg-light transition-all" 
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <Avatar src={getAvatarSrc(player.logo_url)} icon={<UserOutlined />} size={64} className="mb-2 shadow-sm" />
                                        <div className="text-truncate" style={{ fontWeight: 600 }}>{player.username}</div>
                                    </div>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default LeagueInfo;
