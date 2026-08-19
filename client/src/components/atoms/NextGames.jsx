import { Skeleton, Typography, Avatar, theme, Card, Space, Divider, Flex } from 'antd';
import React, { useEffect, useState, useRef } from 'react';
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
const getMatchTimeInfo = (dateStr, token) => {
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
        return { label: 'HOY', time: timeStr, color: token.colorPrimary };
    } else if (isTomorrow) {
        return { label: 'MAÑANA', time: timeStr, color: token.colorPrimary };
    } else {
        const dayStr = matchDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase();
        return { label: dayStr, time: timeStr, color: token.colorTextTertiary || 'rgba(255, 255, 255, 0.45)' };
    }
};

/**
 * Component that displays a scrollable compact row of upcoming and live matches.
 * Automatically updates match statuses from 'scheduled' to 'live' if the time has passed.
 * Fully styled using Ant Design components and Design Tokens.
 * 
 * @returns {React.ReactElement|null} The NextGames horizontal list or null if no games.
 */
const NextGames = () => {
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(false);
    const [nextGames, setNextGames] = useState([]);
    const [isHovered, setIsHovered] = useState(false);
    const scrollRef = useRef(null);
    const scrollDirectionRef = useRef(1); // 1 = right, -1 = left
    const location = useLocation();
    const nav = useNavigate();

    // State to detect mobile devices responsively
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    // Automatic carousel oscillation effect (every 3 seconds)
    useEffect(() => {
        if (nextGames.length <= 1) return;

        const interval = setInterval(() => {
            if (isHovered) return; // Pause scrolling on user hover/touch

            const el = scrollRef.current;
            if (!el) return;

            const maxScroll = el.scrollWidth - el.clientWidth;
            if (maxScroll <= 15) return; // Everything fits on screen, no scroll needed

            const cardWidth = isMobile ? 212 : 252; // minWidth + gap
            const currentScroll = el.scrollLeft;

            // Re-align direction if near boundaries
            if (currentScroll >= maxScroll - 15) {
                scrollDirectionRef.current = -1;
            } else if (currentScroll <= 15) {
                scrollDirectionRef.current = 1;
            }

            if (scrollDirectionRef.current === 1) {
                const target = Math.min(maxScroll, currentScroll + cardWidth);
                el.scrollTo({ left: target, behavior: 'smooth' });
                if (target >= maxScroll - 10) {
                    scrollDirectionRef.current = -1;
                }
            } else {
                const target = Math.max(0, currentScroll - cardWidth);
                el.scrollTo({ left: target, behavior: 'smooth' });
                if (target <= 10) {
                    scrollDirectionRef.current = 1;
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [nextGames.length, isMobile, isHovered]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await API.get('/matches/getByWeek/');
                const gamesList = Array.isArray(response) ? response : [];
                const now = new Date();

                const updatedGames = await Promise.all(gamesList.map(async game => {
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

                const participationsRes = await API.get('/leagueParticipations/get/').catch(() => []);
                const participations = Array.isArray(participationsRes) ? participationsRes : [];
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
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [location.key]);

    if (loading) {
        return (
            <div style={{ padding: `0 ${token.paddingMD}px`, marginTop: token.marginMD, marginBottom: token.marginMD }}>
                <Skeleton.Button active block style={{ height: 60, borderRadius: token.borderRadiusLG }} />
            </div>
        );
    }
    if (nextGames.length === 0) return null;

    return (
        <div style={{ padding: `0 ${token.paddingMD}px`, marginTop: token.marginMD, marginBottom: token.marginMD }}>
            <style>{`
                .next-games-scroll {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .next-games-scroll::-webkit-scrollbar {
                    display: none;
                    width: 0;
                    height: 0;
                }
            `}</style>

            <Text strong style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: token.colorTextSecondary,
                letterSpacing: '0.08em',
                marginBottom: token.marginXS
            }}>
                Próximos Partidos
            </Text>

            <div
                ref={scrollRef}
                className="next-games-scroll"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onTouchStart={() => setIsHovered(true)}
                onTouchEnd={() => setIsHovered(false)}
                style={{
                    display: 'flex',
                    gap: token.marginSM,
                    overflowX: 'auto',
                    paddingBottom: 4,
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {nextGames.map((match) => {
                    const isLive = match.status === 'live';
                    const liveColor = token.colorSuccess || '#10b981';
                    const timeInfo = isLive
                        ? { label: 'EN VIVO', time: '--:--', color: liveColor }
                        : getMatchTimeInfo(match.date, token);

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
                                styles={{ body: { padding: `${token.paddingXS}px ${token.paddingSM}px` } }}
                                style={{
                                    background: token.colorBgContainer,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderLeft: `3px solid ${timeInfo.color}`,
                                    borderRadius: token.borderRadiusLG,
                                    flexShrink: 0,
                                    minWidth: 200,
                                }}
                            >
                                <Space size={token.marginSM} align="center">
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
                                            color: isLive ? liveColor : token.colorText,
                                            lineHeight: 1.2
                                        }}>
                                            {timeInfo.time}
                                        </Text>
                                    </Space>

                                    <Divider type="vertical" style={{ borderColor: token.colorSplit, height: 36, margin: 0 }} />

                                    {/* Right Col: Stacked Teams */}
                                    <Flex vertical gap={4} style={{ minWidth: 95 }}>
                                        <Flex align="center" gap={6}>
                                            <Avatar src={match.Teams?.[0]?.logo_url} size={16} shape="square" style={{ background: 'transparent' }} />
                                            <Text strong style={{ fontSize: 12, color: token.colorText, maxWidth: 75 }} ellipsis>
                                                {match.Teams?.[0]?.name}
                                            </Text>
                                        </Flex>
                                        <Flex align="center" gap={6}>
                                            <Avatar src={match.Teams?.[1]?.logo_url} size={16} shape="square" style={{ background: 'transparent' }} />
                                            <Text strong style={{ fontSize: 12, color: token.colorText, maxWidth: 75 }} ellipsis>
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
                            styles={{ body: { padding: `${token.paddingXS}px ${token.paddingMD}px`, display: 'flex', alignItems: 'center' } }}
                            style={{
                                background: token.colorBgContainer,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderLeft: `3px solid ${timeInfo.color}`,
                                borderRadius: token.borderRadiusLG,
                                flexShrink: 0,
                                minWidth: 240,
                            }}
                        >
                            <Space split={<Divider type="vertical" style={{ borderColor: token.colorSplit, height: 30 }} />}>
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
                                        color: isLive ? liveColor : token.colorText
                                    }}>
                                        {timeInfo.time}
                                    </Text>
                                </Space>

                                {/* Right Col: Teams names & logos */}
                                <Space align="center" size={8}>
                                    <Space size={6} align="center">
                                        <Avatar src={match.Teams?.[0]?.logo_url} size={20} shape="square" style={{ background: 'transparent' }} />
                                        <Text strong style={{ fontSize: 13, color: token.colorText }}>{match.Teams?.[0]?.name}</Text>
                                    </Space>
                                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>vs</Text>
                                    <Space size={6} align="center">
                                        <Avatar src={match.Teams?.[1]?.logo_url} size={20} shape="square" style={{ background: 'transparent' }} />
                                        <Text strong style={{ fontSize: 13, color: token.colorText }}>{match.Teams?.[1]?.name}</Text>
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
