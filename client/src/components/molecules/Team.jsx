import React, { useEffect, useState } from 'react';
import { API } from '../../services/api';
import { Card, Row, Col, Image, Select, Button, Typography, Empty, Skeleton, Space, Divider, Avatar, Flex } from 'antd';
import { useNavigate } from 'react-router-dom';
import { TrophyOutlined, TeamOutlined, GlobalOutlined } from '@ant-design/icons';
import YearFilter from '../atoms/YearFilter';
import SegmentedControl from '../atoms/SegmentedControl';
import { useTheme } from '../../context/ThemeContext';

const { Title, Text } = Typography;

/**
 * Team component for viewing available teams within a selected league. a
 * 
 * @returns {React.ReactElement} The Team page component.
 */
export default function Team() {
    const [teams, setTeams] = useState([]);
    const [leagues, setLeagues] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedLeague, setSelectedLeague] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { isLightMode } = useTheme();

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

    const filteredLeagues = selectedYear
        ? leagues.filter(l => new Date(l.start_date).getFullYear() === selectedYear)
        : leagues;

    // Auto-select first league when year changes and current selection is outside filtered set
    useEffect(() => {
        if (filteredLeagues.length > 0 && selectedLeague && !filteredLeagues.find(l => l.id === selectedLeague)) {
            setSelectedLeague(filteredLeagues[0].id);
        }
    }, [filteredLeagues]);

    const handleYearChange = (year) => {
        setSelectedYear(year);
    };

    if (!loading && leagues.length === 0) {
        return (
            <Flex vertical align="center" justify="center" style={{ minHeight: '60vh' }}>
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
            </Flex>
        );
    }

    return (
        <Flex vertical style={{ padding: 12 }}>
            <Title level={2} style={{ marginBottom: 16 }}>Equipos de la Liga</Title>

            <YearFilter
                leagues={leagues}
                selectedYear={selectedYear}
                onYearChange={handleYearChange}
            />
            <Card
                className="selectors-card"
                style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 16,
                    marginBottom: 24,
                    marginTop: 16
                }}
                styles={{ body: { padding: '16px 20px' } }}
            >
                <Flex vertical>
                    <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>Liga Seleccionada</Text>
                    {loading && leagues.length === 0 ? <Skeleton.Button active /> : (
                        <SegmentedControl 
                            options={filteredLeagues.map(l => ({ value: l.id, label: l.name }))}
                            value={selectedLeague}
                            onChange={setSelectedLeague}
                            disabled={loading && leagues.length === 0}
                        />
                    )}
                </Flex>
            </Card>

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
                                    <Flex align="center" justify="center" style={{ height: 160, padding: 16, background: 'rgba(255,255,255,0.02)' }}>
                                        <Image
                                            src={team.logo_url}
                                            alt={team.name}
                                            style={{ 
                                                maxWidth: 120, 
                                                maxHeight: 120, 
                                                objectFit: 'contain',
                                                filter: isLightMode ? 'none' : 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.25)) drop-shadow(0 0 2px rgba(255, 255, 255, 0.15))'
                                            }}
                                            preview={false}
                                            onClick={() => window.open("https://lol.fandom.com/wiki/" + team.name)}
                                        />
                                    </Flex>
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
        </Flex>
    );
}
