import React, { useEffect, useState, useMemo } from 'react';
import { Avatar, Button, Typography } from 'antd';
import { CloseOutlined, UserOutlined, TrophyOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'framer-motion';

const { Text } = Typography;

const CONFETTI_COLORS = ['#facc15', '#3b82f6', '#10b981', '#ef4444', '#a855f7', '#f97316'];
const CONFETTI_COUNT = 60;

/**
 * Generate confetti pieces with random properties (position, size, rotation, delay, color).
 * Memoized so they don't re-randomize on every render.
 */
function useConfettiPieces() {
    return useMemo(() => {
        return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
            id: i,
            left: Math.random() * 100,              // % from left
            size: 6 + Math.random() * 8,             // px
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            delay: Math.random() * 3,                // seconds
            duration: 2.5 + Math.random() * 3,       // seconds
            rotation: Math.random() * 360,            // initial deg
            rotationEnd: Math.random() * 720 - 360,   // final deg
            swayAmount: (Math.random() - 0.5) * 120,  // px horizontal sway
            isRound: Math.random() > 0.5,
        }));
    }, []);
}

/**
 * A full-screen overlay that celebrates the user winning a league.
 *
 * @param {Object}   props
 * @param {boolean}  props.visible    - Whether to show the celebration
 * @param {Function} props.onClose    - Callback to dismiss
 * @param {string}   props.leagueName - Name of the league won
 * @param {string}   props.username   - Winner username
 * @param {number}   props.points     - Total points
 * @param {string}   props.avatarUrl  - Winner's avatar URL
 * @param {boolean}  props.isCurrentUserWinner - If true, displays 'Has ganado', else 'Ganador de'
 */
function WinnerCelebration({ visible, onClose, leagueName, username, points, avatarUrl, isCurrentUserWinner }) {
    const confettiPieces = useConfettiPieces();
    const [styleSheet, setStyleSheet] = useState(null);

    // Inject keyframes into a <style> tag on mount
    useEffect(() => {
        if (!visible) return;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes winnerConfettiFall {
                0%   { transform: translateY(-20px) rotate(var(--rot-start)) translateX(0); opacity: 1; }
                100% { transform: translateY(110vh) rotate(var(--rot-end)) translateX(var(--sway)); opacity: 0; }
            }
            @keyframes winnerTrophyFloat {
                0%, 100% { transform: translateY(0); }
                50%      { transform: translateY(-18px); }
            }
            @keyframes winnerGlow {
                0%, 100% { text-shadow: 0 0 20px rgba(251,191,36,0.4), 0 0 60px rgba(251,191,36,0.15); }
                50%      { text-shadow: 0 0 30px rgba(251,191,36,0.6), 0 0 80px rgba(251,191,36,0.25); }
            }
        `;
        document.head.appendChild(style);
        setStyleSheet(style);

        return () => {
            if (style.parentNode) style.parentNode.removeChild(style);
        };
    }, [visible]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="winner-celebration"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                    }}
                >
                    {/* ── Confetti ── */}
                    {confettiPieces.map((piece) => (
                        <div
                            key={piece.id}
                            style={{
                                position: 'absolute',
                                top: -20,
                                left: `${piece.left}%`,
                                width: piece.size,
                                height: piece.isRound ? piece.size : piece.size * 1.6,
                                background: piece.color,
                                borderRadius: piece.isRound ? '50%' : 2,
                                opacity: 0,
                                animation: `winnerConfettiFall ${piece.duration}s ${piece.delay}s ease-in infinite`,
                                '--rot-start': `${piece.rotation}deg`,
                                '--rot-end': `${piece.rotationEnd}deg`,
                                '--sway': `${piece.swayAmount}px`,
                                pointerEvents: 'none',
                            }}
                        />
                    ))}

                    {/* ── Trophy ── */}
                    <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                        style={{
                            fontSize: 96,
                            lineHeight: 1,
                            animation: 'winnerTrophyFloat 3s ease-in-out infinite',
                            marginBottom: 16,
                            filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.35))',
                        }}
                    >
                        🏆
                    </motion.div>

                    {/* ── Title ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        style={{
                            fontSize: 48,
                            fontWeight: 900,
                            letterSpacing: '0.04em',
                            background: 'linear-gradient(to right, #fbbf24, #f59e0b, #d97706)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            color: 'transparent',
                            textAlign: 'center',
                            lineHeight: 1.1,
                            animation: 'winnerGlow 2.5s ease-in-out infinite',
                            marginBottom: 8,
                            padding: '0 16px',
                        }}
                    >
                        {isCurrentUserWinner ? '¡ENHORABUENA!' : '¡TENEMOS GANADOR!'}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        style={{
                            fontSize: 20,
                            fontWeight: 500,
                            color: '#cbd5e1',
                            marginBottom: 48,
                            textAlign: 'center',
                        }}
                    >
                        {isCurrentUserWinner ? 'Has ganado ' : 'Ganador de '}
                        <span style={{ color: '#fbbf24', fontWeight: 700 }}>{leagueName}</span>
                    </motion.div>

                    {/* ── User info pill ── */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, type: 'spring', stiffness: 200, damping: 18 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 999,
                            padding: '10px 28px 10px 12px',
                            marginBottom: 40,
                        }}
                    >
                        <Avatar
                            src={avatarUrl}
                            icon={<UserOutlined />}
                            size={48}
                            style={{
                                border: '2px solid #fbbf24',
                                boxShadow: '0 0 16px rgba(251,191,36,0.3)',
                            }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <Text style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                                {username}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#fbbf24', fontWeight: 600 }}>
                                <TrophyOutlined style={{ marginRight: 4 }} />
                                {points} puntos
                            </Text>
                        </div>
                    </motion.div>

                    {/* ── Close button ── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                    >
                        <Button
                            type="primary"
                            size="large"
                            onClick={onClose}
                            icon={<CloseOutlined />}
                            style={{
                                borderRadius: 999,
                                padding: '8px 36px',
                                height: 'auto',
                                fontWeight: 600,
                                background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                                border: 'none',
                                color: '#000',
                                fontSize: 15,
                            }}
                        >
                            Cerrar
                        </Button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default WinnerCelebration;
