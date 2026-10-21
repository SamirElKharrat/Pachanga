import { Typography, Avatar, theme, Card, Space, Divider, Flex } from 'antd';
import React from 'react';

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
 * La tarjeta de un partido de la fila de Próximos Partidos.
 *
 * Vive aparte de NextGames porque también la usa la portada, que no tiene sesión:
 * misma tarjeta, distinto destino al pulsarla. Por eso el `onClick` lo decide
 * quien la pinta.
 *
 * @param {Object} props
 * @param {Object} props.match - Partido con `date`, `status` y `Teams`.
 * @param {boolean} props.isMobile - Versión apilada para pantallas estrechas.
 * @param {Function} [props.onClick]
 */
export default function MatchCard({ match, isMobile, onClick }) {
    const { token } = theme.useToken();

    const isLive = match.status === 'live';
    const liveColor = token.colorSuccess || '#10b981';
    const timeInfo = isLive
        ? { label: 'EN VIVO', time: '--:--', color: liveColor }
        : getMatchTimeInfo(match.date, token);

    if (isMobile) {
        return (
            <Card
                hoverable
                onClick={onClick}
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

    return (
        <Card
            hoverable
            onClick={onClick}
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
}
