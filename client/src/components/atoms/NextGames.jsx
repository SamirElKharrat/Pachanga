import { Skeleton, Typography, Avatar } from 'antd';
import React, { useEffect, useState } from 'react';
import { API } from '../../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { showAlert } from './AlertInfo';

const { Text } = Typography;

/**
 * Component that displays a compact list of upcoming and live matches.
 * Automatically updates match statuses from 'scheduled' to 'live' if the time has passed.
 * 
 * @returns {React.ReactElement|null} The NextGames list or null if no games.
 */
const NextGames = () => {
    const [loading, setLoading] = useState(false);
    const [nextGames, setNextGames] = useState([]);
    const location = useLocation();
    const nav = useNavigate();

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

    if (loading) return <div className="px-3 mb-4"><Skeleton.Button active block style={{ height: 80, borderRadius: 12 }} /></div>;
    if (nextGames.length === 0) return null;

    return (
        <div className="next-games-container px-3 mb-4">
            <style>{`
                .d2-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 12px;
                }
                .d2-item {
                    display: flex;
                    align-items: center;
                    background: #1e293b;
                    border-radius: 12px;
                    padding: 12px 16px;
                    border-left: 4px solid #3b82f6;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .d2-item:hover {
                    transform: translateY(-2px);
                }
                .d2-item.live {
                    border-left-color: #10b981;
                    background: linear-gradient(90deg, rgba(16, 185, 129, 0.1), #1e293b);
                }
                .d2-timebox {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    min-width: 60px;
                    padding-right: 16px;
                    border-right: 1px solid #334155;
                    margin-right: 16px;
                }
                .d2-day { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
                .d2-hour { font-size: 16px; font-weight: 800; color: #e2e8f0; }
                .d2-match {
                    display: flex;
                    align-items: center;
                    flex: 1;
                    gap: 12px;
                }
                .d2-team { font-weight: 600; font-size: 14px; color: #f8fafc; }
                .d2-vs { font-size: 11px; color: #64748b; font-weight: 800; }
            `}</style>
            
            <div className="d2-container">
                {nextGames.map((match) => {
                    const isLive = match.status === 'live';
                    const dateObj = new Date(match.date);
                    
                    const isToday = new Date().toDateString() === dateObj.toDateString();
                    const isTomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toDateString() === dateObj.toDateString();
                    
                    let dayText = isToday ? 'Hoy' : isTomorrow ? 'Mañana' : new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(dateObj);
                    if (isLive) dayText = 'EN VIVO';
                    
                    const hourText = isLive ? '--:--' : new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(dateObj);
                    
                    return (
                        <div 
                            key={match.id} 
                            className={`d2-item ${isLive ? 'live' : ''}`}
                            onClick={() => nav('/predictions/')}
                        >
                            <div className="d2-timebox">
                                <span className="d2-day" style={{ color: isLive ? '#10b981' : undefined }}>{dayText}</span>
                                <span className="d2-hour" style={{ color: isLive ? '#10b981' : undefined }}>{hourText}</span>
                            </div>
                            <div className="d2-match">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
                                    <span className="d2-team" style={{ textAlign: 'right' }}>{match.Teams[0]?.name || 'TBD'}</span>
                                    <Avatar src={match.Teams[0]?.logo_url} size={24} shape="square" className="bg-transparent" />
                                </div>
                                
                                <span className="d2-vs">VS</span>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-start' }}>
                                    <Avatar src={match.Teams[1]?.logo_url} size={24} shape="square" className="bg-transparent" />
                                    <span className="d2-team">{match.Teams[1]?.name || 'TBD'}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default NextGames;
