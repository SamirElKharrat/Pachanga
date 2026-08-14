import React, { useEffect, useState } from 'react';
import { Row, Col, Typography, Space, Button, Avatar, Skeleton, Empty, Flex } from 'antd';
import {
    ArrowLeftOutlined,
    TeamOutlined,
    UserOutlined,
    CalendarOutlined,
    TrophyOutlined,
    RightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { API } from '../../services/api';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import './css/LeagueInfo.css';

const { Title, Text } = Typography;

/**
 * Component for viewing detailed information about a specific league,
 * including final classification (if finished) and modern team grid.
 * 
 * @param {Object} props - Component props.
 * @param {string|number} props.leagueId - The ID of the league to display.
 */
const LeagueInfo = ({ leagueId }) => {
    const [league, setLeague] = useState(null);
    const [teams, setTeams] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const nav = useNavigate();
    const { getAvatarSrc } = useAppTheme();

    useEffect(() => {
        const fetchLeagueData = async () => {
            try {
                setLoading(true);
                const [leagueRes, participantsRes] = await Promise.all([
                    API.get(`/leagues/get/${leagueId}`),
                    API.get(`/leagueParticipations/get/participants/${leagueId}`).catch(() => [])
                ]);

                setLeague(leagueRes);
                setTeams(leagueRes?.Teams || []);
                setParticipants(participantsRes || []);
            } catch (error) {
                console.error("Error loading league details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeagueData();
    }, [leagueId]);

    if (loading && !league) {
        return (
            <div className="league-info-container">
                <Skeleton active avatar paragraph={{ rows: 12 }} />
            </div>
        );
    }

    if (!league) {
        return (
            <div className="league-info-container text-center" style={{ paddingTop: 60 }}>
                <Empty description="Liga no encontrada." />
                <Button type="primary" onClick={() => nav('/leagues')} style={{ marginTop: 16 }}>
                    Volver a Ligas
                </Button>
            </div>
        );
    }

    const isFinished = league.status === 'finished';
    const isLive = league.status === 'live';
    const champion = isFinished && participants.length > 0 ? participants[0] : null;

    const getRankBadgeClass = (rank) => {
        if (rank === 1) return 'gold';
        if (rank === 2) return 'silver';
        if (rank === 3) return 'bronze';
        return '';
    };

    return (
        <div className="league-info-container">
            {/* ─── Back Button ─── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Button
                    shape="circle"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => nav('/leagues')}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>
                    Volver al listado de Ligas
                </Text>
            </div>

            {/* ─── Hero Header ─── */}
            <div className="league-hero-card">
                <Row gutter={[28, 28]} align="middle">
                    {league.logo_url && (
                        <Col xs={24} sm={8} md={6} style={{ textAlign: 'center' }}>
                            <img
                                src={league.logo_url}
                                alt={league.name}
                                className="league-hero-logo"
                            />
                        </Col>
                    )}
                    <Col xs={24} sm={league.logo_url ? 16 : 24} md={league.logo_url ? 18 : 24}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <h1 className="league-hero-title">{league.name}</h1>
                            <span className={`league-status-badge ${isFinished ? 'finished' : isLive ? 'live' : 'scheduled'}`}>
                                {isFinished ? 'Finalizada' : isLive ? 'En curso' : 'Programada'}
                            </span>
                        </div>

                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <Space size={16} wrap>
                                <Space>
                                    <CalendarOutlined style={{ color: '#3b82f6' }} />
                                    <Text style={{ color: '#cbd5e1', fontSize: 13 }}>
                                        {new Date(league.start_date).toLocaleDateString()} — {new Date(league.end_date).toLocaleDateString()}
                                    </Text>
                                </Space>
                                <Space>
                                    <TeamOutlined style={{ color: '#10b981' }} />
                                    <Text style={{ color: '#cbd5e1', fontSize: 13 }}>
                                        {teams.length} Equipos
                                    </Text>
                                </Space>
                                <Space>
                                    <UserOutlined style={{ color: '#f59e0b' }} />
                                    <Text style={{ color: '#cbd5e1', fontSize: 13 }}>
                                        {participants.length} Jugadores
                                    </Text>
                                </Space>
                            </Space>
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* ─── Champion Banner (if Finished) ─── */}
            {champion && champion.User && (
                <div className="league-champion-banner">
                    <Flex align="center" gap={18}>
                        <div className="league-champion-avatar-wrap">
                            <span className="league-champion-crown">👑</span>
                            <Avatar
                                src={getAvatarSrc(champion.User.logo_url)}
                                icon={<UserOutlined />}
                                size={68}
                                style={{
                                    border: '3px solid #f5d576',
                                    boxShadow: '0 0 20px rgba(212, 168, 67, 0.4)'
                                }}
                            />
                        </div>
                        <div>
                            <h2 className="league-champion-name">{champion.User.username}</h2>
                        </div>
                    </Flex>

                    <div className="league-champion-points-badge">
                        <div className="league-champion-points-num">{champion.points}</div>
                    </div>
                </div>
            )}

            {/* ─── Classification & Teams Row ─── */}
            <Row gutter={[24, 24]}>
                {/* Classification Column */}
                <Col xs={24} lg={12}>
                    <div className="league-section-card">
                        <div className="league-section-title">
                            <TrophyOutlined style={{ color: isFinished ? '#f5d576' : '#3b82f6' }} />
                            <span>{isFinished ? 'Clasificación Final' : 'Clasificación Actual'}</span>
                        </div>

                        {participants.length > 0 ? (
                            <div>
                                {participants.map((item, idx) => {
                                    const rank = item.rank || (idx + 1);
                                    const rankClass = getRankBadgeClass(rank);
                                    const rowClass = rank <= 3 ? `rank-${rank}` : '';

                                    return (
                                        <div key={item.id || item.user_id} className={`league-standing-row ${rowClass}`}>
                                            <div className={`league-rank-badge ${rankClass}`}>
                                                {rank === 1 && isFinished ? '👑' : rank}
                                            </div>
                                            <Avatar
                                                src={getAvatarSrc(item.User?.logo_url)}
                                                icon={<UserOutlined />}
                                                size={34}
                                            />
                                            <div className="league-standing-name">
                                                {item.User?.username || 'Usuario'}
                                            </div>
                                            <div className="league-standing-pts">
                                                {item.points} pts
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="No hay participantes registrados en esta liga."
                            />
                        )}
                    </div>
                </Col>

                {/* Teams Column */}
                <Col xs={24} lg={12}>
                    <div className="league-section-card">
                        <div className="league-section-title">
                            <TeamOutlined style={{ color: '#10b981' }} />
                            <span>Equipos Participantes ({teams.length})</span>
                        </div>

                        {teams.length > 0 ? (
                            <div className="league-teams-grid">
                                {teams.map(team => (
                                    <div
                                        key={team.id}
                                        className="league-team-card"
                                        style={{ cursor: 'pointer' }}
                                        title={`Ver ${team.name} en Leaguepedia`}
                                        onClick={() => window.open(`https://lol.fandom.com/wiki/${encodeURIComponent(team.name)}`, '_blank', 'noopener,noreferrer')}
                                    >
                                        <div className="league-team-logo-container">
                                            {team.logo_url ? (
                                                <img
                                                    src={team.logo_url}
                                                    alt={team.name}
                                                    className="league-team-logo"
                                                />
                                            ) : (
                                                <TeamOutlined style={{ fontSize: 28, color: '#94a3b8' }} />
                                            )}
                                        </div>
                                        <div className="league-team-name" title={team.name}>
                                            {team.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="No hay equipos registrados en esta liga."
                            />
                        )}
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default LeagueInfo;
