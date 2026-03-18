import React, { useEffect, useState } from 'react';
import { API } from '../../services/api';
import { Card, Row, Col, Image, Select, Button, Typography, Empty, Skeleton, Space, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import { TrophyOutlined, TeamOutlined, GlobalOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * Team component for viewing available teams within a selected league.
 * 
 * @returns {React.ReactElement} The Team page component.
 */
export default function Team() {
    const [teams, setTeams] = useState([]);
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    /**
     * Fetches leagues and teams data.
     */
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await API.get('/leagueParticipations/get/');
                const leaguePromises = response.map(participation =>
                    API.get('/leagues/get/' + participation.league_id)
                );
                const leagueArray = await Promise.all(leaguePromises);
                const sortedLeagues = leagueArray.sort((a, b) => b.id - a.id);
                setLeagues(sortedLeagues);

                if (sortedLeagues.length > 0) {
                    const leagueId = selectedLeague || sortedLeagues[0].id;
                    if (!selectedLeague) setSelectedLeague(leagueId);

                    const currentLeague = leagueArray.find(l => l.id == leagueId);
                    if (currentLeague) {
                        setTeams(currentLeague.Teams || []);
                    }
                }
            } catch (error) {
                console.error('Error fetching team data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedLeague]);

    if (!loading && leagues.length === 0) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                <Empty
                    description={
                        <Space direction="vertical">
                            <Title level={3}>No estás en ninguna liga</Title>
                            <Text type="secondary">Únete a una liga para ver los equipos participantes.</Text>
                        </Space>
                    }
                >
                    <Button type="primary" size="large" onClick={() => navigate('/leagues/')}>
                        Buscar Ligas
                    </Button>
                </Empty>
            </div>
        );
    }

    return (
        <div className="p-3">
            <Title level={2} className="mb-4">Equipos de la Liga</Title>

            <Select
                placeholder="Selecciona una liga"
                options={leagues.map(l => ({ label: l.name, value: l.id }))}
                value={selectedLeague}
                onChange={setSelectedLeague}
                style={{ width: '100%', maxWidth: 300, marginBottom: 24 }}
            />

            <Divider />

            {loading ? (
                <Row gutter={[24, 24]}>
                    {[1, 2, 3, 4].map(i => (
                        <Col key={i} xs={24} sm={12} md={8} lg={6}>
                            <Card className="shadow-sm">
                                <Skeleton active avatar paragraph={{ rows: 1 }} />
                            </Card>
                        </Col>
                    ))}
                </Row>
            ) : teams.length > 0 ? (
                <Row gutter={[24, 24]}>
                    {teams.map((team) => (
                        <Col key={team.id} xs={24} sm={12} md={8} lg={6}>
                            <Card
                                hoverable
                                className="shadow-sm h-100 text-center"
                                cover={
                                    <div className="p-4 d-flex justify-content-center align-items-center" style={{ height: 160, background: 'rgba(255,255,255,0.02)' }}>
                                        <Image
                                            src={team.logo_url}
                                            alt={team.name}
                                            style={{ maxWidth: 120, maxHeight: 120, objectFit: 'contain' }}
                                            preview={false}
                                            onClick={() => window.open("https://lol.fandom.com/wiki/" + team.name)}
                                        />
                                    </div>
                                }
                            >
                                <Card.Meta 
                                    title={<Title level={4} className="m-0">{team.name}</Title>}
                                    description={
                                        <Button 
                                            type="link" 
                                            icon={<TeamOutlined />} 
                                            onClick={() => window.open("https://lol.fandom.com/wiki/" + team.name)}
                                        >
                                            Ver detalles
                                        </Button>
                                    }
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>
            ) : (
                <Empty description="No se encontraron equipos para esta liga." />
            )}
        </div>
    );
}
