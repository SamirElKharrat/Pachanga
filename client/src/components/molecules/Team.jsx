import React, { useEffect, useState } from 'react';
import { API } from '../../services/api';
import { Card, Row, Col, Image, Select, Button, Typography, Empty, Skeleton, Space, Divider, Avatar } from 'antd';
import { useNavigate } from 'react-router-dom';
import { TrophyOutlined, TeamOutlined, GlobalOutlined } from '@ant-design/icons';
import YearFilter from '../atoms/YearFilter';

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

            <YearFilter
                leagues={leagues}
                selectedYear={selectedYear}
                onYearChange={handleYearChange}
            />
            {/* ── Scrollbar hiding style ── */}
            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .selectors-card .ant-card-body {
                    padding: 16px 20px;
                }
                @media (max-width: 576px) {
                    .selectors-card .ant-card-body {
                        padding: 12px 14px !important;
                    }
                    .segmented-ctrl-item {
                        padding: 4px 10px !important;
                        font-size: 11px !important;
                        border-radius: 6px !important;
                        gap: 6px !important;
                    }
                    .segmented-ctrl-item .ant-avatar {
                        width: 14px !important;
                        height: 14px !important;
                    }
                    .segmented-ctrl-container {
                        border-radius: 8px !important;
                        padding: 3px !important;
                        gap: 3px !important;
                    }
                }
            `}</style>

            <Card
                className="selectors-card"
                style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 16,
                    marginBottom: 24
                }}
            >
                {/* LIGA SELECCIONADA */}
                <div>
                    <Text strong style={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'rgba(255, 255, 255, 0.5)',
                        letterSpacing: '0.08em',
                        marginBottom: 10
                    }}>
                        Liga Seleccionada
                    </Text>
                    <div style={{
                        display: 'flex',
                        background: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: '10px',
                        padding: '4px',
                        gap: '4px',
                        width: 'fit-content',
                        maxWidth: '100%',
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                    }} className="hide-scrollbar segmented-ctrl-container">
                        {loading && leagues.length === 0 ? (
                            <Skeleton.Button active style={{ height: 32, width: 120, borderRadius: 8 }} />
                        ) : (
                            filteredLeagues.map(league => {
                                const isActive = league.id === selectedLeague;
                                return (
                                    <button
                                        key={league.id}
                                        className="segmented-ctrl-item"
                                        onClick={() => setSelectedLeague(league.id)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '6px 14px',
                                            borderRadius: 8,
                                            border: 'none',
                                            background: isActive ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                                            color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.4)' : 'none',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0
                                        }}
                                        onMouseEnter={e => {
                                            if (!isActive) {
                                                e.currentTarget.style.color = '#fff';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive) {
                                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                                            }
                                        }}
                                    >
                                        {league.logo_url && (
                                            <Avatar
                                                src={league.logo_url}
                                                size={18}
                                                shape="square"
                                                style={{
                                                    borderRadius: 4,
                                                    background: 'transparent',
                                                    filter: isActive ? 'brightness(1.2)' : 'none'
                                                }}
                                            />
                                        )}
                                        {league.name}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
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
