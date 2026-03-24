import { Carousel, Skeleton, Typography, Tag, Col, Row, Avatar, Card, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { API } from '../../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { showAlert } from './AlertInfo';

const { Text } = Typography;

/**
 * Groups an array of matches into chunks for display in the carousel slides.
 * 
 * @param {Array} matches - The matches to group.
 * @returns {Array<Array>} An array of match groups.
 */
const groupMatches = (matches) => {
    const isMobile = window.innerWidth <= 768;
    const chunkSize = isMobile ? 1 : 6;
    const result = [];
    for (let i = 0; i < matches.length; i += chunkSize) {
        result.push(matches.slice(i, i + chunkSize));
    }
    return result;
};

/**
 * Component that displays a scrollable carousel of upcoming and live matches.
 * Automatically updates match statuses from 'scheduled' to 'live' if the time has passed.
 * 
 * @returns {React.ReactElement|null} The NextGames carousel or null if no games.
 */
const NextGames = () => {
    const [loading, setLoading] = useState(false);
    const [nextGames, setNextGames] = useState([]);
    const location = useLocation();
    const nav = useNavigate();
    const { token } = theme.useToken();

    /**
     * Fetches and filters matches for the current user's leagues.
     */
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await API.get('/matches/getByWeek/');
                const now = new Date();
                
                const updatedGames = await Promise.all(response.map(async game => {
                    const matchDate = new Date(game.date);
                    if (matchDate <= now && game.status === 'scheduled') {
                        try {
                            await API.put('/matches/update/' + game.id, { status: 'live' });
                            return { ...game, status: 'live' }; 
                        } catch {
                            return game;
                        }
                    }
                    return game; 
                }));

                const participations = await API.get('/leagueParticipations/get/');
                const leagueIds = participations.map(p => p.league_id);

                const filtered = updatedGames
                    .filter(g => g.status !== 'finished' && leagueIds.includes(g.league_id))
                    .sort((a, b) => {
                        if (a.status === 'live' && b.status !== 'live') return -1;
                        if (a.status !== 'live' && b.status === 'live') return 1;
                        return new Date(a.date) - new Date(b.date);
                    });

                setNextGames(filtered);
            } catch (error) {
                console.error("Error fetching carousel games:", error);
                showAlert('error', "No se pudieron cargar los próximos partidos");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [location.key]);

    if (loading) return <div className="px-3 mb-4"><Skeleton.Button active block style={{ height: 120, borderRadius: 12 }} /></div>;
    if (nextGames.length === 0) return null;

    const grouped = groupMatches(nextGames);

    return (
        <div className="next-games-carousel px-3 mb-4">
            <Carousel
                autoplay
                autoplaySpeed={5000}
                dots={{ className: 'custom-dots' }}
                infinite
                style={{ 
                    background: token.colorFillTertiary, 
                    borderRadius: 16, 
                    padding: '20px 0',
                    border: `1px solid ${token.colorBorder}`
                }}
            >
                {grouped.map((group, i) => (
                    <div key={i}>
                        <Row gutter={[12, 12]} justify="center" className="px-4">
                            {group.map((match) => (
                                <Col key={match.id} xs={24} sm={12} md={8} lg={4}>
                                    <Card 
                                        hoverable
                                        size="small"
                                        className="text-center match-card-item border-0"
                                        style={{ background: token.colorBgContainer, borderRadius: 12 }}
                                        onClick={() => nav('/predictions/')}
                                    >
                                        <div className="d-flex flex-column align-items-center">
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <Avatar src={match.Teams[0]?.logo_url} size={32} shape="square" className="bg-transparent" />
                                                <Text strong className="text-secondary" style={{ fontSize: 12 }}>VS</Text>
                                                <Avatar src={match.Teams[1]?.logo_url} size={32} shape="square" className="bg-transparent" />
                                            </div>
                                            <Tag 
                                                color={match.status === 'live' ? 'error' : 'processing'} 
                                                className="m-0 border-0" 
                                                style={{ fontSize: 10, fontWeight: 700 }}
                                            >
                                                {match.status === 'live' ? 'LIVE' : 'UPCOMING'}
                                            </Tag>
                                            <Text type="secondary" style={{ fontSize: 10, marginTop: 4 }}>
                                                {new Intl.DateTimeFormat('es-ES', {
                                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                }).format(new Date(match.date))}
                                            </Text>
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>
                ))}
            </Carousel>
        </div>
    );
};

export default NextGames;
