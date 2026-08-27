import React, { useState, useEffect } from 'react';
import { Tag, Button, Space, Typography, Flex } from 'antd';
import { BookOutlined, LinkOutlined } from '@ant-design/icons';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

const { Text } = Typography;

const STATUS_CONFIG = {
    scheduled: { color: 'default', label: 'Programada', dotColor: 'var(--text-faint)' },
    live:      { color: 'success', label: 'En curso',   dotColor: 'var(--success)', pulse: true },
    finished:  { color: 'blue',    label: 'Finalizada', dotColor: 'var(--accent)' },
};

/**
 * A horizontal panel that shows extra info about the currently selected league.
 *
 * @param {Object}   props
 * @param {Object}   props.league       - League object (name, logo_url, status, rules, leaguepedia_url, stats_url, start_date, end_date)
 * @param {Function} props.onShowRules  - Callback to show rules modal
 */
function LeagueInfoPanel({ league, onShowRules }) {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const { isLightMode } = useAppTheme();

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    if (!league) return null;

    const statusKey = league.status || 'scheduled';
    const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.scheduled;

    // Inject pulse keyframe for live status
    const pulseStyle = cfg.pulse
        ? {
              animation: 'leaguePanelPulse 2s ease-in-out infinite',
          }
        : {};

    return (
        <>
            {/* Pulse keyframe — only injected once */}
            {cfg.pulse && (
                <style>{`
                    @keyframes leaguePanelPulse {
                        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(var(--success-rgb),0.5); }
                        50%      { opacity: 0.7; box-shadow: 0 0 0 6px rgba(var(--success-rgb),0); }
                    }
                `}</style>
            )}
            <Flex
                vertical={isMobile}
                align={isMobile ? 'stretch' : 'center'}
                gap={isMobile ? 12 : 16}
                style={{
                    background: isLightMode ? '#ffffff' : 'rgba(var(--tint),0.03)',
                    border: `1px solid ${isLightMode ? '#e2e8f0' : 'rgba(var(--tint),0.08)'}`,
                    boxShadow: isLightMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    borderRadius: 16,
                    padding: '12px 20px',
                    marginBottom: 16,
                }}
            >
                {/* League identity */}
                <Flex align="center" gap={16} style={{ flex: 1, minWidth: 0, width: '100%' }}>
                    {league.logo_url && (
                        <img
                            src={league.logo_url}
                            alt={league.name}
                            style={{
                                width: 60,
                                height: 60,
                                objectFit: 'contain',
                                flexShrink: 0,
                                borderRadius: 8,
                                background: 'transparent',
                                filter: isLightMode ? 'none' : 'drop-shadow(0 0 8px rgba(var(--tint), 0.25)) drop-shadow(0 0 2px rgba(var(--tint), 0.15))'
                            }}
                        />
                    )}
                    <Flex vertical style={{ minWidth: 0, flex: 1 }}>
                        <Text
                            strong
                            style={{
                                fontSize: 16,
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: isLightMode ? '#0f172a' : 'rgba(var(--tint),0.9)',
                            }}
                        >
                            {league.name}
                        </Text>
                        {(league.start_date || league.end_date) && (
                            <Text
                                type="secondary"
                                style={{ fontSize: 12, marginTop: 2 }}
                            >
                                {league.start_date
                                    ? new Date(league.start_date).toLocaleDateString()
                                    : ''}
                                {league.start_date && league.end_date ? ' – ' : ''}
                                {league.end_date
                                    ? new Date(league.end_date).toLocaleDateString()
                                    : ''}
                            </Text>
                        )}
                    </Flex>
                </Flex>

                {/* Status + Actions */}
                <Flex
                    align="center"
                    gap={10}
                    wrap="wrap"
                >
                    {/* Status badge */}
                    <Tag
                        color={cfg.color}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            borderRadius: 999,
                            padding: '2px 12px',
                            fontWeight: 600,
                            fontSize: 12,
                            margin: 0,
                        }}
                    >
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: cfg.dotColor,
                                display: 'inline-block',
                                ...pulseStyle,
                            }}
                        />
                        {cfg.label}
                    </Tag>

                    {/* Action buttons */}
                    <Space size={6}>
                        {league.rules && (
                            <Button
                                type="text"
                                size="small"
                                icon={<BookOutlined />}
                                onClick={onShowRules}
                                style={{
                                    color: isLightMode ? '#64748b' : 'rgba(var(--tint),0.65)',
                                    fontSize: 13,
                                    borderRadius: 8,
                                }}
                            >
                                Reglamento
                            </Button>
                        )}
                        {league.leaguepedia_url && (
                            <Button
                                type="text"
                                size="small"
                                icon={<LinkOutlined />}
                                onClick={() => window.open(league.leaguepedia_url, '_blank', 'noopener')}
                                style={{
                                    color: isLightMode ? '#64748b' : 'rgba(var(--tint),0.65)',
                                    fontSize: 13,
                                    borderRadius: 8,
                                }}
                            >
                                Leaguepedia
                            </Button>
                        )}
                    </Space>
                </Flex>
            </Flex>
        </>
    );
}

export default LeagueInfoPanel;
