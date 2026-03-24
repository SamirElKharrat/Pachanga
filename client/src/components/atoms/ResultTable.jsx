import React, { useMemo, useState } from 'react';
import { Avatar, Typography, Tag, Tooltip, Empty, Button } from 'antd';
import { LeftOutlined, RightOutlined, CheckCircleFilled, CloseCircleFilled, MinusCircleFilled, TrophyFilled } from '@ant-design/icons';

const { Text } = Typography;

const PAGE_SIZE = 5;

const OUTCOME_CONFIG = {
    correct: {
        icon: <CheckCircleFilled style={{ color: '#10b981', fontSize: 16 }} />,
        label: 'Acertado',
        tagColor: 'success',
        borderColor: 'rgba(16,185,129,0.3)',
        bg: 'rgba(16,185,129,0.05)',
        pts: '+0 pts',
    },
    partial: {
        icon: <MinusCircleFilled style={{ color: '#faad14', fontSize: 16 }} />,
        label: 'Parcial',
        tagColor: 'warning',
        borderColor: 'rgba(250,173,20,0.3)',
        bg: 'rgba(250,173,20,0.05)',
        pts: '+0 pts',
    },
    wrong: {
        icon: <CloseCircleFilled style={{ color: '#ef4444', fontSize: 16 }} />,
        label: 'Fallido',
        tagColor: 'error',
        borderColor: 'rgba(239,68,68,0.25)',
        bg: 'rgba(239,68,68,0.04)',
        pts: '+0 pts',
    },
    nopred: {
        icon: <MinusCircleFilled style={{ color: '#64748b', fontSize: 16 }} />,
        label: 'Sin predicción',
        tagColor: 'default',
        borderColor: 'rgba(100,116,139,0.2)',
        bg: 'transparent',
        pts: '—',
    },
};

/**
 * Shows the user's prediction history for matches that already have results.
 *
 * Props:
 *  - results: Array of result objects { match_id, winner, result (score string) }
 *  - matches: Array of match objects that have a result, each with Teams[] populated
 *  - userPredictions: Array of the current user's predictions { match_id, winner, description }
 */
const ResultTable = ({ results, matches, userPredictions = [] }) => {
    const [page, setPage] = useState(0);

    const rows = useMemo(() => {
        return matches
            .map(match => {
                const result = results.find(r => r.match_id === match.id);
                if (!result) return null;

                const pred = userPredictions.find(p => p.match_id === match.id);

                const winnerTeam = match.Teams.find(t => t.id === result.winner);
                const loserTeam = match.Teams.find(t => t.id !== result.winner);

                let outcome = 'nopred';
                if (pred) {
                    const correctWinner = result.winner === pred.winner;
                    const correctScore = result.result === pred.description;
                    if (correctWinner && correctScore) outcome = 'correct';
                    else if (correctWinner) outcome = 'partial';
                    else outcome = 'wrong';
                }

                const predictedTeam = pred?.winner
                    ? match.Teams.find(t => t.id === pred.winner)
                    : null;

                return { key: match.id, match, result, pred, winnerTeam, loserTeam, predictedTeam, outcome };
            })
            .filter(Boolean)
            .reverse();
    }, [results, matches, userPredictions]);

    const totalPages = Math.ceil(rows.length / PAGE_SIZE);
    const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    if (rows.length === 0) {
        return <Empty description="Aún no hay resultados disponibles para esta liga." style={{ padding: '24px 0' }} />;
    }

    return (
        <div>
            {/* Cards list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pageRows.map(row => {
                    const cfg = OUTCOME_CONFIG[row.outcome];
                    return (
                        <div
                            key={row.key}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto',
                                gap: '8px 12px',
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: `1px solid ${cfg.borderColor}`,
                                background: cfg.bg,
                                transition: 'all 0.2s',
                            }}
                        >
                            {/* Left: teams + score + vote */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>

                                {/* Teams row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Tooltip title={row.loserTeam?.name}>
                                        <Avatar
                                            src={row.loserTeam?.logo_url}
                                            shape="square"
                                            size={30}
                                            style={{ opacity: 0.35, flexShrink: 0 }}
                                        />
                                    </Tooltip>

                                    <div style={{ textAlign: 'center', minWidth: 48 }}>
                                        <Text strong style={{ fontSize: 15, letterSpacing: 1 }}>
                                            {row.result.result ?? '–'}
                                        </Text>
                                    </div>

                                    <Tooltip title={row.winnerTeam?.name}>
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <Avatar src={row.winnerTeam?.logo_url} shape="square" size={36} />
                                            <TrophyFilled
                                                style={{
                                                    position: 'absolute',
                                                    top: -5,
                                                    right: -5,
                                                    fontSize: 11,
                                                    color: '#faad14',
                                                    background: 'rgba(0,0,0,0.75)',
                                                    borderRadius: '50%',
                                                    padding: 2,
                                                }}
                                            />
                                        </div>
                                    </Tooltip>

                                    <Text
                                        type="secondary"
                                        style={{
                                            fontSize: 11,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            flex: 1,
                                        }}
                                    >
                                        {row.loserTeam?.name} vs {row.winnerTeam?.name}
                                    </Text>
                                </div>


                            </div>

                            {/* Right: tag + points */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center',
                                    gap: 4,
                                    flexShrink: 0,
                                }}
                            >
                                <Tag
                                    color={cfg.tagColor}
                                    bordered={false}
                                    style={{ margin: 0, fontSize: 10, fontWeight: 600 }}
                                >
                                    {cfg.label}
                                </Tag>
                                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                                    {row.outcome === 'nopred' ? '—' : `+${row.pred?.points || 0} pts`}
                                </Text>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: '1px solid rgba(154,176,218,0.12)',
                    }}
                >
                    <Button
                        type="text"
                        size="small"
                        icon={<LeftOutlined />}
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                    />

                    {/* Dot indicators */}
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setPage(i)}
                                style={{
                                    width: i === page ? 18 : 7,
                                    height: 7,
                                    borderRadius: 4,
                                    border: 'none',
                                    padding: 0,
                                    background: i === page ? '#3b82f6' : 'rgba(154,176,218,0.3)',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s',
                                    outline: 'none',
                                }}
                            />
                        ))}
                    </div>

                    <Button
                        type="text"
                        size="small"
                        icon={<RightOutlined />}
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                    />
                </div>
            )}
        </div>
    );
};

export default ResultTable;
