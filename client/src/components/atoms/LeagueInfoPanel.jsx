import React, { useState, useEffect } from 'react';
import { Avatar, Tag, Button, Space, Typography } from 'antd';
import { BookOutlined, LinkOutlined } from '@ant-design/icons';

const { Text } = Typography;

const STATUS_CONFIG = {
    scheduled: { color: 'default', label: 'Programada', dotColor: '#64748b' },
    live:      { color: 'success', label: 'En curso',   dotColor: '#10b981', pulse: true },
    finished:  { color: 'blue',    label: 'Finalizada', dotColor: '#3b82f6' },
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
                        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
                        50%      { opacity: 0.7; box-shadow: 0 0 0 6px rgba(16,185,129,0); }
                    }
                `}</style>
            )}
            <div
                style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: isMobile ? 12 : 16,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    padding: '12px 20px',
                    marginBottom: 16,
                }}
            >
                {/* League identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <Avatar
                        src={league.logo_url}
                        size={40}
                        shape="square"
                        style={{ borderRadius: 8, flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                        <Text
                            strong
                            style={{
                                fontSize: 15,
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: 'rgba(255,255,255,0.9)',
                            }}
                        >
                            {league.name}
                        </Text>
                        {(league.start_date || league.end_date) && (
                            <Text
                                type="secondary"
                                style={{ fontSize: 12 }}
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
                    </div>
                </div>

                {/* Status + Actions */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                    }}
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
                                    color: 'rgba(255,255,255,0.65)',
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
                                    color: 'rgba(255,255,255,0.65)',
                                    fontSize: 13,
                                    borderRadius: 8,
                                }}
                            >
                                Leaguepedia
                            </Button>
                        )}
                    </Space>
                </div>
            </div>
        </>
    );
}

export default LeagueInfoPanel;
