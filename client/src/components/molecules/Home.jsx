import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Select, Avatar, Tooltip, Typography, Button, Empty, List, Tag, Space, Skeleton } from 'antd';
import { UserOutlined, FilterOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHomeData } from '../../hooks/useHomeData';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

const { Text } = Typography;

const MATCHES_PER_GROUP = 6;

// Split array into chunks of `size`
function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

const STATUS_COLORS = {
    pending: { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.12)', text: '#94a3b8' },
    correct: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)', text: '#10b981' },
    partial: { bg: 'rgba(250, 173, 20, 0.12)', border: 'rgba(250, 173, 20, 0.35)', text: '#faad14' },
    wrong: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)', text: '#ef4444' },
};

// ── Helper to get a participant's prediction + status for a match ────────────
function getPredInfo(match, participation, predictions, results) {
    const pred = predictions.find(
        p => p.match_id === match.id &&
            (p.User?.id === participation.User?.id || p.user_id === participation.user_id)
    );
    const result = results.find(r => r.match_id === match.id);
    const predictedTeam = pred?.winner ? match.Teams.find(t => t.id === pred.winner) : null;
    const status = !result
        ? 'pending'
        : result.winner === pred?.winner
            ? result.result === pred?.description ? 'correct' : 'partial'
            : 'wrong';
    return { pred, predictedTeam, status };
}

// ── Desktop: user-centric 6x6 grid of cards ──────────────────────────────────
// ── Desktop: single user row with 6-column wrapping grid ──────────────────────
function DesktopMatchGroupBlock({ matchGroup, participation, predictions, results, currentUser }) {
    const isCurrent = currentUser?.id === participation.id;
    const { getAvatarSrc } = useAppTheme();
    return (
        <div style={{ position: 'relative' }}>
            {/* User Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
                paddingLeft: 4
            }}>
                <Avatar
                    src={getAvatarSrc(participation.User?.logo_url)}
                    icon={<UserOutlined />}
                    size={32}
                    style={{
                        border: isCurrent ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.15)',
                        boxShadow: isCurrent ? '0 0 10px rgba(59,130,246,0.3)' : 'none'
                    }}
                />
                <Text style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isCurrent ? '#3b82f6' : 'rgba(255,255,255,0.85)',
                    letterSpacing: '0.02em'
                }}>
                    {participation.User?.username} {isCurrent && '(Tú)'}
                </Text>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))',
                gap: 10
            }}>
                {matchGroup.map(match => {
                    const { pred, predictedTeam, status } = getPredInfo(match, participation, predictions, results);
                    const c = STATUS_COLORS[status];

                    return (
                        <div key={match.id}
                            style={{
                                background: c.bg,
                                border: `1px solid ${c.border}`,
                                borderRadius: 10,
                                padding: '8px 4px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                transition: 'all 0.2s ease',
                                minHeight: 100,
                                boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                <Avatar src={match.Teams?.[0]?.logo_url} shape="square" size={12} style={{ borderRadius: 2 }} />
                                <Text type="secondary" style={{ fontSize: 7, fontWeight: 800, opacity: 0.5 }}>VS</Text>
                                <Avatar src={match.Teams?.[1]?.logo_url} shape="square" size={12} style={{ borderRadius: 2 }} />
                            </div>

                            {predictedTeam ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                    <Avatar
                                        src={predictedTeam.logo_url}
                                        shape="square"
                                        size={32}
                                        style={{ borderRadius: 6, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))' }}
                                    />
                                    {pred?.description && (
                                        <Text style={{ fontSize: 11, color: c.text, fontWeight: 800, lineHeight: 1 }}>
                                            {pred.description}
                                        </Text>
                                    )}
                                </div>
                            ) : (
                                <Text type="secondary" style={{ fontSize: 18, fontWeight: 300 }}>–</Text>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Mobile: vertically stacked matches (No horizontal scroll) ────────────────
// ── Mobile: vertically stacked matches for a single user ────────────────────
function MobileMatchGroupBlock({ matchGroup, participation, predictions, results, currentUser }) {
    const isCurrent = currentUser?.id === participation.id;
    const { getAvatarSrc } = useAppTheme();
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
            {/* User header for mobile block */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px 8px' }}>
                <Avatar src={getAvatarSrc(participation.User?.logo_url)} icon={<UserOutlined />} size={28} style={{ border: isCurrent ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)' }} />
                <Text strong style={{ fontSize: 13, color: isCurrent ? '#3b82f6' : 'inherit' }}>{participation.User?.username}</Text>
            </div>

            {matchGroup.map(match => {
                const { pred, predictedTeam, status } = getPredInfo(match, participation, predictions, results);
                const c = STATUS_COLORS[status];
                return (
                    <div key={match.id} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14,
                        overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', background: 'rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Avatar src={match.Teams[0]?.logo_url} shape="square" size={20} style={{ borderRadius: 4 }} />
                                <Text type="secondary" style={{ fontSize: 8, fontWeight: 900, opacity: 0.3, margin: '0 8px' }}>VS</Text>
                                <Avatar src={match.Teams[1]?.logo_url} shape="square" size={20} style={{ borderRadius: 4 }} />
                            </div>
                        </div>

                        <div style={{ padding: '10px 16px', background: c.bg, borderTop: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                            {predictedTeam ? (
                                <>
                                    <Avatar src={predictedTeam.logo_url} shape="square" size={24} style={{ borderRadius: 5 }} />
                                    {pred?.description && <Text style={{ fontSize: 13, color: c.text, fontWeight: 700 }}>{pred.description}</Text>}
                                </>
                            ) : (
                                <Text type="secondary" style={{ fontSize: 14 }}>Sin predicción</Text>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Responsive wrapper ─────────────────────────────────────────────────────────
function MatchGroupBlock(props) {
    const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);
    React.useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    return isMobile
        ? <MobileMatchGroupBlock {...props} />
        : (
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '16px 20px', marginBottom: 24 }}>
                <DesktopMatchGroupBlock {...props} />
            </div>
        );
}






function Home() {
    const location = useLocation();
    const nav = useNavigate();
    const { getAvatarSrc } = useAppTheme();

    const [selectedLeague, setSelectedLeague] = useState(location.state?.leagueId || null);
    const [selectedWeek, setSelectedWeek] = useState(null);
    const [filteredParticipants, setFilteredParticipants] = useState(null);
    // Ref to track which league the current `weeks` array belongs to
    const weeksLeagueRef = React.useRef(null);

    const {
        leagues,
        participants,
        matches,
        predictions,
        results,
        favoriteTeams,
        weeks,
        loading,
        predictionsMade,
        currentUser,
    } = useHomeData(selectedLeague, selectedWeek);

    useEffect(() => {
        if (leagues.length > 0 && selectedLeague === null) {
            setSelectedLeague(leagues[0].id);
        }
    }, [leagues]);

    // Cuando cambie la liga, resetear la semana inmediatamente
    const handleLeagueChange = (val) => {
        setSelectedLeague(val);
        setSelectedWeek(null);
        setFilteredParticipants(null);
        weeksLeagueRef.current = null; // invalidate
    };

    // Auto-seleccionar semana cuando llegan las semanas de la liga activa
    useEffect(() => {
        if (weeks.length === 0) return;
        // Solo actuar si las semanas pertenecen a la liga seleccionada actualmente
        if (weeksLeagueRef.current === selectedLeague && selectedWeek !== null) return;

        weeksLeagueRef.current = selectedLeague;
        const todayStr = new Date().toISOString().split('T')[0];
        const currentWeek = weeks.find(w => todayStr >= w.start && todayStr <= w.end);
        // Si hay semana actual -> esa. Si no -> la última semana disponible
        setSelectedWeek(currentWeek ? currentWeek.id : weeks[weeks.length - 1].id);
    }, [weeks]);

    useEffect(() => {
        if (participants.length > 0 && !filteredParticipants) {
            setFilteredParticipants(participants);
        }
    }, [participants]);

    if (!loading && leagues.length === 0) {
        return (
            <div
                style={{
                    minHeight: '60vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                }}
            >
                <Empty
                    description={
                        <Space direction="vertical">
                            <Text strong>No estás unido a ninguna liga</Text>
                            <Text type="secondary">Únete a una liga para empezar a predecir resultados.</Text>
                        </Space>
                    }
                >
                    <Button type="primary" size="large" onClick={() => nav('/leagues/')}>
                        Ver ligas disponibles
                    </Button>
                </Empty>
            </div>
        );
    }

    const handleParticipantFilter = participation => {
        if (currentUser && participation.id === currentUser.id) {
            setFilteredParticipants([participation]);
        } else {
            setFilteredParticipants([currentUser, participation].filter(Boolean));
        }
    };

    const visibleParticipants = filteredParticipants || participants;
    const matchGroups = chunkArray(matches, MATCHES_PER_GROUP);

    return (
        <div style={{ padding: '12px 12px 32px' }}>

            {/* ── Selectors ── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>Liga</Text>
                    <Select
                        style={{ width: '100%' }}
                        size="large"
                        placeholder="Elige una liga"
                        value={selectedLeague}
                        onChange={handleLeagueChange}
                        loading={loading && leagues.length === 0}
                    >
                        {leagues.map(league => (
                            <Select.Option key={league.id} value={league.id}>
                                {league.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Col>
                <Col xs={24} sm={12}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>Semana</Text>
                    <Select
                        style={{ width: '100%' }}
                        size="large"
                        placeholder="Elige una semana"
                        value={selectedWeek}
                        onChange={setSelectedWeek}
                        loading={loading && weeks.length === 0}
                    >
                        {weeks.map(week => (
                            <Select.Option key={week.id} value={week.id}>
                                {week.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Col>
            </Row>

            {/* ── Main content ── */}
            <Row gutter={[12, 16]}>

                {/* Clasificación */}
                <Col xs={24} lg={8}>
                    <Card
                        title="Clasificación"
                        extra={
                            <Tooltip title="Filtro para eliminar las selecciones">
                                <Button
                                    type="text"
                                    icon={<FilterOutlined />}
                                    onClick={() => setFilteredParticipants(participants)}
                                />
                            </Tooltip>
                        }
                        styles={{ body: { padding: 0 } }}
                    >
                        {loading ? (
                            <Skeleton active style={{ padding: 16 }} />
                        ) : (
                            <List
                                dataSource={[...participants].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))}
                                renderItem={(item) => {
                                    const favTeam = favoriteTeams.find(f => f.user_id === item.User.id)?.team;
                                    const isCurrent = currentUser?.id === item.id;
                                    const rank = item.rank ?? 999;
                                    const rankColor =
                                        rank === 1 ? '#fbbf24' :
                                            rank === 2 ? '#94a3b8' :
                                                rank === 3 ? '#b45309' : '#334155';

                                    // Movement indicator
                                    const movement = item.movement;
                                    const movementEl = movement === 'up'
                                        ? <span style={{ color: '#10b981', fontSize: 13, fontWeight: 900, lineHeight: 1 }}>▲</span>
                                        : movement === 'down'
                                            ? <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 900, lineHeight: 1 }}>▼</span>
                                            : movement === 'same'
                                                ? <span style={{ color: '#64748b', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>—</span>
                                                : null; // first week or no data

                                    return (
                                        <List.Item
                                            key={item.user_id}
                                            onClick={() => handleParticipantFilter(item)}
                                            style={{
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                background: isCurrent ? 'rgba(59,130,246,0.05)' : 'transparent',
                                                borderLeft: isCurrent ? '3px solid #3b82f6' : '3px solid transparent',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8 }}>
                                                {/* Rank badge */}
                                                <div
                                                    style={{
                                                        width: 26, height: 26,
                                                        background: rankColor,
                                                        borderRadius: 6,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 800, fontSize: 11,
                                                        color: rank <= 3 ? '#000' : '#fff',
                                                        boxShadow: rank <= 3 ? `0 0 8px ${rankColor}55` : 'none',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {rank}
                                                </div>
                                                {/* Movement arrow */}
                                                <div style={{ width: 14, textAlign: 'center', flexShrink: 0 }}>
                                                    {movementEl}
                                                </div>
                                                <Avatar src={getAvatarSrc(item.User.logo_url)} icon={<UserOutlined />} size={32} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <Text strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {item.User.username}
                                                    </Text>
                                                    {favTeam && (
                                                        <Tooltip title={favTeam.name}>
                                                            <Avatar size={14} shape="square" src={favTeam.logo_url} style={{ borderRadius: 2 }} />
                                                        </Tooltip>
                                                    )}
                                                </div>
                                                <Tag color="gold" style={{ margin: 0 }}>{item.points} pts</Tag>
                                            </div>
                                        </List.Item>
                                    );
                                }}
                            />
                        )}

                    </Card>
                </Col>

                {/* Predicciones */}
                <Col xs={24} lg={16}>
                    <Card
                        title="Predicciones de la Semana"
                        loading={loading}
                        styles={{ body: { padding: '12px 10px' } }}
                    >
                        {(!predictionsMade || matches.length === 0) ? (
                            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                                {matches.length === 0 ? (
                                    <Empty description="No hay partidos programados para esta semana" />
                                ) : (
                                    <Space direction="vertical" align="center">
                                        <Text type="secondary">
                                            Haz las predicciones cochino.
                                        </Text>
                                        <Button
                                            type="primary"
                                            size="large"
                                            onClick={() => nav('/predictions/')}
                                            style={{ marginTop: 12 }}
                                        >
                                            Haz las predicciones cochino
                                        </Button>
                                    </Space>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {visibleParticipants.map((participation) => (
                                    <MatchGroupBlock
                                        key={participation.id}
                                        matchGroup={matches}
                                        participation={participation}
                                        participants={visibleParticipants}
                                        predictions={predictions}
                                        results={results}
                                        currentUser={currentUser}
                                    />
                                ))}
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default Home;