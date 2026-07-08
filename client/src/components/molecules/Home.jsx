import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Avatar, Tooltip, Typography, Button, Empty, List, Tag, Space, Skeleton, Modal, Flex, theme } from 'antd';
import { UserOutlined, FilterOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useHomeData } from '../../hooks/useHomeData';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import YearFilter from '../atoms/YearFilter';
import WinnerCelebration from '../atoms/WinnerCelebration';
import LeagueInfoPanel from '../atoms/LeagueInfoPanel';
import SegmentedControl from '../atoms/SegmentedControl';
import { API } from '../../services/api';

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
function DesktopMatchGroupBlock({ matchGroup, participation, predictions, results, currentUser }) {
    const isCurrent = currentUser?.id === participation.id;
    const { getAvatarSrc } = useAppTheme();
    return (
        <Flex vertical gap="middle" style={{ position: 'relative' }}>
            {/* User Header */}
            <Space align="center" size={10} style={{ paddingLeft: 4 }}>
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
            </Space>

            <Flex
                wrap="wrap"
                gap={10}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))'
                }}
            >
                {matchGroup.map(match => {
                    const { pred, predictedTeam, status } = getPredInfo(match, participation, predictions, results);
                    const c = STATUS_COLORS[status];

                    return (
                        <Card
                            key={match.id}
                            styles={{
                                body: {
                                    padding: '8px 4px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    minHeight: 100
                                }
                            }}
                            style={{
                                background: c.bg,
                                border: `1px solid ${c.border}`,
                                borderRadius: 10,
                                boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <Flex align="center" gap={4} style={{ marginBottom: 2 }}>
                                <Avatar src={match.Teams?.[0]?.logo_url} shape="square" size={12} style={{ borderRadius: 2 }} />
                                <Text type="secondary" style={{ fontSize: 7, fontWeight: 800, opacity: 0.5 }}>VS</Text>
                                <Avatar src={match.Teams?.[1]?.logo_url} shape="square" size={12} style={{ borderRadius: 2 }} />
                            </Flex>

                            {predictedTeam ? (
                                <Flex vertical align="center" gap={3}>
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
                                </Flex>
                            ) : (
                                <Text type="secondary" style={{ fontSize: 18, fontWeight: 300 }}>–</Text>
                            )}
                        </Card>
                    );
                })}
            </Flex>
        </Flex>
    );
}

// ── Mobile: vertically stacked matches for a single user ────────────────────
function MobileMatchGroupBlock({ matchGroup, participation, predictions, results, currentUser }) {
    const isCurrent = currentUser?.id === participation.id;
    const { getAvatarSrc } = useAppTheme();
    const { token } = theme.useToken();
    return (
        <Flex vertical gap={8} style={{ marginBottom: 24 }}>
            {/* User header for mobile block */}
            <Space align="center" size={10} style={{ padding: '0 4px 4px' }}>
                <Avatar src={getAvatarSrc(participation.User?.logo_url)} icon={<UserOutlined />} size={26} style={{ border: isCurrent ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)' }} />
                <Text strong style={{ fontSize: 13, color: isCurrent ? '#3b82f6' : 'inherit' }}>{participation.User?.username}</Text>
            </Space>

            {matchGroup.map(match => {
                const { pred, predictedTeam, status } = getPredInfo(match, participation, predictions, results);
                const c = STATUS_COLORS[status];

                const shortLabel = `${match.Teams?.[0]?.acronym} vs ${match.Teams?.[1]?.acronym}`;

                return (
                    <Flex
                        key={match.id}
                        align="center"
                        justify="space-between"
                        style={{
                            padding: '8px 12px',
                            background: c.bg,
                            border: `1px solid ${c.border}`,
                            borderRadius: 12,
                            minHeight: 40
                        }}
                    >
                        {/* Left side: The Matchup (compact logos + text) */}
                        <Flex align="center" gap={8}>
                            <Avatar src={match.Teams?.[0]?.logo_url} shape="square" size={18} style={{ borderRadius: 3, background: 'transparent' }} />
                            <Text type="secondary" style={{ fontSize: 9, fontWeight: 900, opacity: 0.3 }}>VS</Text>
                            <Avatar src={match.Teams?.[1]?.logo_url} shape="square" size={18} style={{ borderRadius: 3, background: 'transparent' }} />
                            <Text strong style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', marginLeft: 2 }}>
                                {shortLabel}
                            </Text>
                        </Flex>

                        {/* Right side: The Prediction status */}
                        <Flex align="center" gap={8}>
                            {predictedTeam ? (
                                <Flex align="center" gap={6}>
                                    <Avatar src={predictedTeam.logo_url} shape="square" size={18} style={{ borderRadius: 3, background: 'transparent' }} />
                                    {pred?.description && (
                                        <Text strong style={{ fontSize: 12, color: c.text, fontWeight: 800 }}>
                                            {pred.description}
                                        </Text>
                                    )}
                                </Flex>
                            ) : (
                                <Text type="secondary" style={{ fontSize: 11, opacity: 0.5 }}>—</Text>
                            )}
                        </Flex>
                    </Flex>
                );
            })}
        </Flex>
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
            <Card
                styles={{ body: { padding: '16px 20px' } }}
                style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, marginBottom: 24 }}
            >
                <DesktopMatchGroupBlock {...props} />
            </Card>
        );
}

function Home() {
    const location = useLocation();
    const nav = useNavigate();
    const { getAvatarSrc } = useAppTheme();
    const { token } = theme.useToken();

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedLeague, setSelectedLeague] = useState(location.state?.leagueId || null);
    const [selectedWeek, setSelectedWeek] = useState(null);
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [showCelebration, setShowCelebration] = useState(true);
    const [rulesModalVisible, setRulesModalVisible] = useState(false);

    // State to collapse/expand filter selection panel
    const [filtersCollapsed, setFiltersCollapsed] = useState(() => {
        return localStorage.getItem('pachanga_filters_collapsed') === 'true';
    });

    // Ref to track which league the current `weeks` array belongs to
    const weeksLeagueRef = useRef(null);

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

    const filteredLeagues = selectedYear
        ? leagues.filter(l => new Date(l.start_date).getFullYear() === selectedYear)
        : leagues;

    useEffect(() => {
        if (filteredLeagues.length > 0 && (selectedLeague === null || !filteredLeagues.find(l => l.id === selectedLeague))) {
            setSelectedLeague(filteredLeagues[0].id);
        }
    }, [filteredLeagues]);

    const handleYearChange = (year) => {
        setSelectedYear(year);
    };

    // Cuando cambie la liga, resetear la semana inmediatamente
    const handleLeagueChange = (val) => {
        setSelectedLeague(val);
        setSelectedWeek(null);
        setSelectedParticipants([]);
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
        if (currentWeek) {
            setSelectedWeek(currentWeek.id);
        } else {
            // Si la liga no ha empezado aún (hoy es antes de la primera semana) -> Semana 1
            if (todayStr < weeks[0].start) {
                setSelectedWeek(weeks[0].id);
            } else {
                // Si la liga ya terminó (hoy es después del final) -> Última semana
                setSelectedWeek(weeks[weeks.length - 1].id);
            }
        }
    }, [weeks]);



    // Check and update league status (scheduled -> live -> finished) based on current date
    useEffect(() => {
        if (!leagues || leagues.length === 0) return;

        const checkAndUpdateLeagues = async () => {
            const now = new Date();
            let statusChanged = false;

            for (const league of leagues) {
                const startDate = new Date(league.start_date);
                const endDate = new Date(league.end_date);
                let newStatus = null;

                if (now >= startDate && now <= endDate && league.status === 'scheduled') {
                    newStatus = 'live';
                } else if (now > endDate && league.status !== 'finished') {
                    newStatus = 'finished';
                }

                if (newStatus) {
                    try {
                        await API.put(`/leagues/update/${league.id}`, { status: newStatus });
                        statusChanged = true;
                    } catch (error) {
                        console.error(`Error updating league ${league.id} status:`, error);
                    }
                }
            }
        };

        checkAndUpdateLeagues();
    }, [leagues]);

    // Reset celebration state when selected league changes
    useEffect(() => {
        setShowCelebration(true);
    }, [selectedLeague]);

    if (!loading && leagues.length === 0) {
        return (
            <Flex vertical align="center" justify="center" style={{ minHeight: '60vh', padding: 24 }}>
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
            </Flex>
        );
    }

    const handleParticipantFilter = participation => {
        if (currentUser && participation.id === currentUser.id) {
            return; // El usuario logueado siempre está seleccionado/activo
        }
        setSelectedParticipants(prev => {
            const isSelected = prev.some(p => p.id === participation.id);
            if (isSelected) {
                return prev.filter(p => p.id !== participation.id);
            } else {
                return [...prev, participation];
            }
        });
    };

    const handleRemoveParticipant = participation => {
        setSelectedParticipants(prev => prev.filter(p => p.id !== participation.id));
    };

    const handleClearAll = () => {
        setSelectedParticipants([]);
    };

    const visibleParticipants = (() => {
        if (selectedParticipants.length === 0) {
            return participants;
        }
        // Mostrar siempre el usuario logueado + los seleccionados
        const list = [];
        const currentParticipation = participants.find(p => p.id === currentUser?.id);
        if (currentParticipation) {
            list.push(currentParticipation);
        }
        selectedParticipants.forEach(p => {
            if (p.id !== currentUser?.id) {
                list.push(p);
            }
        });
        return list;
    })();
    const matchGroups = chunkArray(matches, MATCHES_PER_GROUP);

    return (
        <Flex vertical style={{ padding: '12px 12px 32px' }}>

            {/* ── Scrollbar hiding style & premium select toggles ── */}
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
                }
            `}</style>

            {/* ── Collapsible selectors card ── */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24}>
                    <Card
                        className="selectors-card"
                        title={
                            <Space size={8}>
                                <FilterOutlined style={{ color: token.colorPrimary }} />
                                <span style={{ fontSize: 13, fontWeight: 700 }}>Filtros de Competición</span>
                            </Space>
                        }
                        extra={
                            <Button
                                type="text"
                                size="small"
                                onClick={() => {
                                    setFiltersCollapsed(prev => {
                                        const next = !prev;
                                        localStorage.setItem('pachanga_filters_collapsed', String(next));
                                        return next;
                                    });
                                }}
                                icon={filtersCollapsed ? <DownOutlined /> : <UpOutlined />}
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                                {filtersCollapsed ? 'Mostrar' : 'Ocultar'}
                            </Button>
                        }
                        style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: 16,
                            marginBottom: 0
                        }}
                    >
                        {filtersCollapsed ? (
                            <Space split={<span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>} style={{ width: '100%' }} wrap>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Año: <span style={{ color: token.colorText, fontWeight: 600 }}>{selectedYear || 'Todos'}</span>
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Liga: <span style={{ color: token.colorText, fontWeight: 600 }}>{leagues.find(l => l.id === selectedLeague)?.name || 'Ninguna'}</span>
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Semana: <span style={{ color: token.colorText, fontWeight: 600 }}>{weeks.find(w => w.id === selectedWeek)?.name || 'Ninguna'}</span>
                                </Text>
                            </Space>
                        ) : (
                            <Row gutter={[16, 16]}>
                                {/* AÑO (Restored custom YearFilter) */}
                                <Col xs={24}>
                                    <YearFilter
                                        leagues={leagues}
                                        selectedYear={selectedYear}
                                        onYearChange={handleYearChange}
                                    />
                                </Col>

                                {/* LIGA SELECCIONADA */}
                                <Col xs={24}>
                                    <Flex vertical gap={8}>
                                        <Text strong style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>Liga Seleccionada</Text>
                                        {loading && leagues.length === 0 ? (
                                            <Skeleton.Button active block style={{ height: 32 }} />
                                        ) : (
                                            <SegmentedControl
                                                options={filteredLeagues.map(l => ({ value: l.id, label: l.name }))}
                                                value={selectedLeague}
                                                onChange={handleLeagueChange}
                                                disabled={loading && leagues.length === 0}
                                            />
                                        )}
                                    </Flex>
                                </Col>

                                {/* SEMANA */}
                                <Col xs={24}>
                                    <Flex vertical gap={8}>
                                        <Text strong style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>Semana</Text>
                                        {loading && weeks.length === 0 ? (
                                            <Skeleton.Button active block style={{ height: 32 }} />
                                        ) : (
                                            <SegmentedControl
                                                options={weeks.map(w => {
                                                    const todayStr = new Date().toISOString().split('T')[0];
                                                    const isCurrent = todayStr >= w.start && todayStr <= w.end;
                                                    return { value: w.id, label: `${w.name} ${isCurrent ? '(Actual)' : ''}` };
                                                })}
                                                value={selectedWeek}
                                                onChange={setSelectedWeek}
                                                disabled={loading && weeks.length === 0}
                                            />
                                        )}
                                    </Flex>
                                </Col>
                            </Row>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* ── League Info Panel ── */}
            <LeagueInfoPanel
                league={leagues.find(l => l.id === selectedLeague)}
                onShowRules={() => setRulesModalVisible(true)}
            />

            {/* ── Main content ── */}
            <Row gutter={[12, 16]}>

                {/* Clasificación */}
                <Col xs={24} lg={8}>
                    <Card
                        title="Clasificación"
                        extra={
                            selectedParticipants.length > 0 ? (
                                <Tooltip title="Quitar todos los filtros">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<FilterOutlined style={{ color: '#ef4444' }} />}
                                        onClick={handleClearAll}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    />
                                </Tooltip>
                            ) : null
                        }
                        styles={{ body: { padding: 0 } }}
                    >
                        {loading ? (
                            <Skeleton active style={{ padding: 16 }} />
                        ) : (
                            <>
                                {selectedParticipants.length > 0 && (
                                    <div style={{
                                        padding: '12px 14px',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        background: 'rgba(255,255,255,0.01)'
                                    }}>
                                        <Flex wrap="wrap" gap={6}>
                                            {selectedParticipants.map(p => (
                                                <Tag
                                                    key={p.id}
                                                    closable
                                                    onClose={() => handleRemoveParticipant(p)}
                                                    color="success"
                                                    style={{
                                                        background: 'rgba(16, 185, 129, 0.12)',
                                                        border: '1px solid rgba(16, 185, 129, 0.25)',
                                                        color: '#10b981',
                                                        borderRadius: 4,
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        padding: '1px 5px',
                                                        margin: 0,
                                                        display: 'inline-flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    {p.User?.username}
                                                </Tag>
                                            ))}
                                        </Flex>
                                    </div>
                                )}
                                <List
                                    dataSource={[...participants].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))}
                                    renderItem={(item) => {
                                        const favTeam = favoriteTeams.find(f => f.user_id === item.User.id)?.team;
                                        const isCurrent = currentUser?.id === item.id;
                                        const isSelected = selectedParticipants.some(p => p.id === item.id);
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
                                                    cursor: (isCurrent) ? 'default' : 'pointer',
                                                    background: isSelected
                                                        ? 'rgba(16, 185, 129, 0.08)'
                                                        : (isCurrent ? 'rgba(59,130,246,0.05)' : 'transparent'),
                                                    borderLeft: isSelected
                                                        ? '3px solid #10b981'
                                                        : (isCurrent ? '3px solid #3b82f6' : '3px solid transparent'),
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <Flex align="center" gap={8} style={{ width: '100%' }}>
                                                    {/* Rank badge */}
                                                    <Flex
                                                        align="center"
                                                        justify="center"
                                                        style={{
                                                            width: 26, height: 26,
                                                            background: rankColor,
                                                            borderRadius: 6,
                                                            fontWeight: 800, fontSize: 11,
                                                            color: rank <= 3 ? '#000' : '#fff',
                                                            boxShadow: rank <= 3 ? `0 0 8px ${rankColor}55` : 'none',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {rank}
                                                    </Flex>
                                                    {/* Movement arrow */}
                                                    <Flex justify="center" align="center" style={{ width: 14, flexShrink: 0 }}>
                                                        {movementEl}
                                                    </Flex>
                                                    <Avatar src={getAvatarSrc(item.User.logo_url)} icon={<UserOutlined />} size={32} />
                                                    <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                                                        <Text strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {item.User.username} {isCurrent && <span style={{ color: '#3b82f6', fontSize: 11, fontWeight: 700 }}>(Tú)</span>}
                                                        </Text>
                                                        {favTeam && (
                                                            <Tooltip title={favTeam.name}>
                                                                <Avatar size={14} shape="square" src={favTeam.logo_url} style={{ borderRadius: 2 }} />
                                                            </Tooltip>
                                                        )}
                                                    </Flex>
                                                    <Tag color="gold" style={{ margin: 0 }}>{item.points} pts</Tag>
                                                </Flex>
                                            </List.Item>
                                        );
                                    }}
                                />
                            </>
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
                            <Flex justify="center" align="center" style={{ padding: '40px 16px' }}>
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
                                            Ir a las predicciones.
                                        </Button>
                                    </Space>
                                )}
                            </Flex>
                        ) : (
                            <Flex vertical gap={10}>
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
                            </Flex>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* ── Rules Modal ── */}
            <Modal
                title="Reglamento"
                open={rulesModalVisible}
                onCancel={() => setRulesModalVisible(false)}
                footer={null}
                styles={{ body: { maxHeight: '60vh', overflowY: 'auto', whiteSpace: 'pre-wrap' } }}
            >
                {leagues.find(l => l.id === selectedLeague)?.rules || 'No hay reglamento disponible.'}
            </Modal>

            {/* ── Winner Celebration ── */}
            {(() => {
                const currentLeague = leagues.find(l => l.id === selectedLeague);
                const isFinished = currentLeague?.status === 'finished';
                if (!isFinished) return null;

                // Only calculate winner and show once loading is complete
                const winner = !loading && participants.length > 0
                    ? [...participants].sort((a, b) => (b.points || 0) - (a.points || 0))[0]
                    : null;
                if (!winner) return null;

                const seenKey = `celebration_seen_${selectedLeague}`;
                const hasSeen = localStorage.getItem(seenKey);
                if (hasSeen) return null;

                const isCurrentUserWinner = currentUser && winner.User?.id === currentUser.id;

                return (
                    <WinnerCelebration
                        visible={showCelebration}
                        onClose={() => {
                            localStorage.setItem(seenKey, 'true');
                            setShowCelebration(false);
                        }}
                        leagueName={currentLeague.name}
                        username={winner.User?.username}
                        points={winner.points}
                        avatarUrl={getAvatarSrc(winner.User?.logo_url)}
                        isCurrentUserWinner={isCurrentUserWinner}
                    />
                );
            })()}
        </Flex>
    );
}

export default Home;