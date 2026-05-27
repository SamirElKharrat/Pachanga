import { Skeleton, Typography, theme } from 'antd';
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
                    
                    return (
                        <div 
                            key={match.id}
                            onClick={() => nav('/predictions/')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'rgba(30, 41, 59, 0.4)',
                                border: `1px solid ${token.colorBorder}`,
                                borderLeft: `3px solid ${timeInfo.color}`,
                                borderRadius: 12,
                                padding: '8px 16px',
                                cursor: 'pointer',
                                transition: 'all 0.25s ease',
                                flexShrink: 0,
                                minWidth: 240,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)';
                                e.currentTarget.style.borderColor = token.colorBorder;
                            }}
                        >
                            {/* Left Col: Badge status / time */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingRight: 14,
                                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                                minWidth: 70,
                                textAlign: 'center',
                            }}>
                                <span style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: timeInfo.color,
                                    letterSpacing: '0.05em',
                                    marginBottom: 2
                                }}>
                                    {timeInfo.label}
                                </span>
                                <span style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: isLive ? '#10b981' : 'rgba(255, 255, 255, 0.9)'
                                }}>
                                    {timeInfo.time}
                                </span>
                            </div>

                            {/* Right Col: Teams names text */}
                            <div style={{
                                paddingLeft: 16,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontWeight: 700,
                                fontSize: 13,
                                color: 'rgba(255, 255, 255, 0.9)',
                            }}>
                                <span>{match.Teams?.[0]?.name}</span>
                                <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 500 }}>vs</span>
                                <span>{match.Teams?.[1]?.name}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default NextGames;
