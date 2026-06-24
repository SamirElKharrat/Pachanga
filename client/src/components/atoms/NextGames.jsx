import { Skeleton, Typography, Avatar, theme, Card, Space, Divider, Flex } from 'antd';
import React, { useEffect, useState } from 'react';
import { API } from '../../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { showAlert } from './AlertInfo';

const { Text } = Typography;

/**
 * Formats match date into friendly labels like 'HOY', 'MAÑANA' or day/month string.
 * 
 * @param {string} dateStr - ISO date string of the match.
 * @returns {Object} Helper object with label, time and theme color.
 */
const getMatchTimeInfo = (dateStr) => {
    const matchDate = new Date(dateStr);
    const now = new Date();
    
    const isToday = matchDate.getDate() === now.getDate() &&
        matchDate.getMonth() === now.getMonth() &&
        matchDate.getFullYear() === now.getFullYear();
        
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = matchDate.getDate() === tomorrow.getDate() &&
        matchDate.getMonth() === tomorrow.getMonth() &&
        matchDate.getFullYear() === tomorrow.getFullYear();
        
    const timeStr = matchDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) {
        return { label: 'HOY', time: timeStr, color: '#3b82f6' };
    } else if (isTomorrow) {
        return { label: 'MAÑANA', time: timeStr, color: '#3b82f6' };
    } else {
        const dayStr = matchDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase();
        return { label: dayStr, time: timeStr, color: 'rgba(255, 255, 255, 0.4)' };
    }
};

/**
 * Component that displays a scrollable compact row of upcoming and live matches.
 * Automatically updates match statuses from 'scheduled' to 'live' if the time has passed.
 * 
 * @returns {React.ReactElement|null} The NextGames horizontal list or null if no games.
 */
const NextGames = () => {
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(false);
    const [nextGames, setNextGames] = useState([]);
    const location = useLocation();
    const nav = useNavigate();
    
    // State to detect mobile devices responsively
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

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

                // Get only up to 6 games to prevent huge lists
                setNextGames(filtered.slice(0, 6));
            } catch (error) {
                console.error("Error fetching next games:", error);
                showAlert('error', "No se pudieron cargar los próximos partidos");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [location.key]);

    if (loading) return <div className="px-3 mb-4"><Skeleton.Button active block style={{ height: 60, borderRadius: 12 }} /></div>;
    if (nextGames.length === 0) return null;

    return (
        <div className="next-games-container px-3 mb-4">
            <style>{`
                .next-games-scroll::-webkit-scrollbar {
                    height: 5px;
                }
                .next-games-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 4px;
                }
                .next-games-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
            `}</style>
            
            <Text strong style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.5)',
                letterSpacing: '0.08em',
                marginBottom: 10
            }}>
                Próximos Partidos
            </Text>

            <div 
                className="next-games-scroll"
                style={{
                    display: 'flex',
                    gap: 12,
                    overflowX: 'auto',
                    paddingBottom: 8,
                    scrollbarWidth: 'thin',
                    msOverflowStyle: 'auto',
                }}
            >
                {nextGames.map((match) => {
                    const isLive = match.status === 'live';
                    const timeInfo = isLive 
                        ? { label: 'EN VIVO', time: '--:--', color: '#10b981' }
                        : getMatchTimeInfo(match.date);
                    
                    if (isMobile) {
                        // Mobile View: Stacked compact matchups
                        return (
                            <Card
                                key={match.id}
                                hoverable
                                onClick={() => {
                                    if (isLive) {
                                        window.open('https://www.twitch.tv/caedrel', '_blank');
                                    } else {
                                        nav('/predictions/');
                                    }
                                }}
                                styles={{ body: { padding: '10px 14px' } }}
                                style={{
                                    background: 'rgba(30, 41, 59, 0.4)',
                                    border: `1px solid ${token.colorBorder}`,
                                    borderLeft: `3px solid ${timeInfo.color}`,
                                    borderRadius: 12,
                                    flexShrink: 0,
                                    minWidth: 200,
                                }}
                            >
                                <Space size={12} align="center">
                                    {/* Left Col: Badge status / time */}
                                    <Space direction="vertical" size={2} align="center" style={{ minWidth: 52 }}>
                                        <Text style={{
                                            fontSize: 9,
                                            fontWeight: 800,
                                            color: timeInfo.color,
                                            letterSpacing: '0.05em',
                                            lineHeight: 1
                                        }}>
                                            {timeInfo.label}
                                        </Text>
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: isLive ? '#10b981' : 'rgba(255, 255, 255, 0.9)',
                                            lineHeight: 1.2
                                        }}>
                                            {timeInfo.time}
                                        </Text>
                                    </Space>

                                    <Divider type="vertical" style={{ borderColor: 'rgba(255, 255, 255, 0.1)', height: 36, margin: 0 }} />

                                    {/* Right Col: Stacked Teams */}
                                    <Flex vertical gap={4} style={{ minWidth: 95 }}>
                                        <Flex align="center" gap={6}>
                                            <Avatar src={match.Teams?.[0]?.logo_url} size={16} shape="square" style={{ background: 'transparent' }} />
                                            <Text strong style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', maxWidth: 75 }} ellipsis>
                                                {match.Teams?.[0]?.name}
                                            </Text>
                                        </Flex>
                                        <Flex align="center" gap={6}>
                                            <Avatar src={match.Teams?.[1]?.logo_url} size={16} shape="square" style={{ background: 'transparent' }} />
                                            <Text strong style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', maxWidth: 75 }} ellipsis>
                                                {match.Teams?.[1]?.name}
                                            </Text>
                                        </Flex>
                                    </Flex>
                                </Space>
                            </Card>
                        );
                    }

                    // Desktop View: Horizontal Match Layout
                    return (
                        <Card
                            key={match.id}
                            hoverable
                            onClick={() => {
                                if (isLive) {
                                    window.open('https://www.twitch.tv/caedrel', '_blank');
                                } else {
                                    nav('/predictions/');
                                }
                            }}
                            styles={{ body: { padding: '8px 16px', display: 'flex', alignItems: 'center' } }}
                            style={{
                                background: 'rgba(30, 41, 59, 0.4)',
                                border: `1px solid ${token.colorBorder}`,
                                borderLeft: `3px solid ${timeInfo.color}`,
                                borderRadius: 12,
                                flexShrink: 0,
                                minWidth: 240,
                            }}
                        >
                            <Space split={<Divider type="vertical" style={{ borderColor: 'rgba(255, 255, 255, 0.1)', height: 30 }} />}>
                                {/* Left Col: Badge status / time */}
                                <Space direction="vertical" size={0} align="center" style={{ minWidth: 60 }}>
                                    <Text style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: timeInfo.color,
                                        letterSpacing: '0.05em'
                                    }}>
                                        {timeInfo.label}
                                    </Text>
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: isLive ? '#10b981' : 'rgba(255, 255, 255, 0.9)'
                                    }}>
                                        {timeInfo.time}
                                    </Text>
                                </Space>

                                {/* Right Col: Teams names & logos */}
                                <Space align="center" size={8}>
                                    <Space size={6} align="center">
                                        <Avatar src={match.Teams?.[0]?.logo_url} size={20} shape="square" style={{ background: 'transparent' }} />
                                        <Text strong style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)' }}>{match.Teams?.[0]?.name}</Text>
                                    </Space>
                                    <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 500 }}>vs</Text>
                                    <Space size={6} align="center">
                                        <Avatar src={match.Teams?.[1]?.logo_url} size={20} shape="square" style={{ background: 'transparent' }} />
                                        <Text strong style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)' }}>{match.Teams?.[1]?.name}</Text>
                                    </Space>
                                </Space>
                            </Space>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default NextGames;
