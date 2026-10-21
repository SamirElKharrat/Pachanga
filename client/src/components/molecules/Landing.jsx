import React, { useEffect, useState } from 'react';
import { Layout, Card, Row, Col, Typography, Button, Avatar, Tag, Flex, Space, theme } from 'antd';
import { UserOutlined, ArrowRightOutlined, ThunderboltOutlined, FireOutlined, TrophyOutlined } from '@ant-design/icons';
import { MotionConfig, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API } from '../../services/api';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import useIsMobile from '../../hooks/useIsMobile';
import BrandMark from '../atoms/BrandMark';
import MatchCard from '../atoms/MatchCard';
import Footer from '../atoms/Footer';
import ScreenshotCarousel from '../atoms/ScreenshotCarousel';
import { STATUS_COLORS, QUESTION_POINTS, MATCH_POINTS } from '../../constants/pachanga';
import './css/Landing.css';

const { Title, Text, Paragraph } = Typography;

const SECTION_LABEL = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 10,
};

/**
 * Una jornada de ejemplo para el abanico del hero. Son datos inventados: la portada
 * no enseña predicciones de nadie de verdad.
 *
 * `rest` y `spread` son la posición de cada carta parada y al pasar el ratón; el
 * pleno va el último para quedar encima, junto a la pegatina.
 */
const EXAMPLE_PICKS = [
    { match: 'BDS vs TH', pick: 'BDS', score: '2-0', status: 'wrong', x: -120, r: -12, y: 18 },
    { match: 'SK vs GX', pick: 'GX', score: '0-2', status: 'pending', x: -40, r: -4, y: 0 },
    { match: 'KC vs VIT', pick: 'KC', score: '2-1', status: 'partial', x: 40, r: 4, y: 0 },
    { match: 'G2 vs FNC', pick: 'G2', score: '2-1', status: 'correct', x: 120, r: 12, y: 18 },
];

const STEPS = [
    {
        icon: <ThunderboltOutlined />,
        tone: { bg: 'rgba(var(--accent-rgb), 0.15)', fg: 'var(--accent)' },
        title: 'Predice la jornada',
        text: 'Elige ganador y marcador de cada partido antes de que empiece. Puedes cambiarlo hasta el último minuto.',
    },
    {
        icon: <FireOutlined />,
        tone: { bg: 'rgba(var(--pred-pleno-rgb), 0.15)', fg: 'var(--pred-pleno)' },
        title: 'Suma con cada resultado',
        text: 'En Inicio ves al momento cómo le fue a cada uno: verde si clavas el pleno, ámbar si aciertas el ganador, rojo si la lías.',
    },
    {
        icon: <TrophyOutlined />,
        tone: { bg: 'rgba(var(--medal-gold-rgb), 0.15)', fg: 'var(--medal-gold)' },
        title: 'Gana la Pachanga',
        text: 'Cada liga reparte puntos a la clasificación del año. El campeón se queda para siempre en el Hall of Flame.',
    },
];

const streakLengths = MATCH_POINTS.streak.map(s => s.length).join(', ').replace(/, (\d+)$/, ' y $1');

const POINTS = [
    { value: `+${MATCH_POINTS.winner}`, label: 'Aciertas el ganador', color: 'var(--pred-acierto)' },
    { value: `+${MATCH_POINTS.exactBO3}`, label: 'Pleno en un BO3: marcador exacto', color: 'var(--pred-pleno)' },
    { value: `+${MATCH_POINTS.exactBO5}`, label: 'Pleno en un BO5', color: 'var(--pred-pleno)' },
    { value: `+${MATCH_POINTS.favoriteOnExact}`, label: 'Extra si el pleno es con tu equipo favorito', color: 'var(--accent-light)' },
    { value: `+${MATCH_POINTS.streak.map(s => s.bonus).join('/')}`, label: `Rachas de ${streakLengths} plenos en la semana`, color: 'var(--flame)' },
    { value: `+${QUESTION_POINTS}`, label: 'Pregunta semanal acertada', color: 'var(--violet)' },
];

/** El podio se pinta 2.º, 1.º, 3.º: el ganador en el centro y más alto. */
const PODIUM_ORDER = [2, 1, 3];

/** Entrada suave al hacer scroll. Con «reducir movimiento» activado, no se mueve. */
const reveal = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.45, ease: 'easeOut' },
};

/** Lleva a una sección de la portada. Los anclajes no sirven: el router se los come. */
const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/**
 * La portada: lo que ve quien entra en la web sin sesión.
 *
 * Cuenta qué es la Pachanga y cuánto vale cada acierto, y enseña dos cosas vivas
 * que salen de un endpoint público: los próximos partidos y el podio del Hall of
 * Flame. Nada
 * más. Las predicciones de la gente no salen de dentro de la web.
 *
 * Quien ya tiene sesión nunca llega aquí: en `/` le recibe Inicio, como siempre.
 */
export default function Landing() {
    const nav = useNavigate();
    const { token } = theme.useToken();
    const { getAvatarSrc } = useAppTheme();
    const isMobile = useIsMobile(768);
    const [showcase, setShowcase] = useState({ podium: [], nextMatches: [] });

    useEffect(() => {
        let cancelled = false;
        API.get('/pachanga/showcase')
            .then(data => {
                if (cancelled || !data) return;
                setShowcase({
                    podium: Array.isArray(data.podium) ? data.podium : [],
                    nextMatches: Array.isArray(data.nextMatches) ? data.nextMatches : [],
                });
            })
            // La portada se sostiene sin estos datos: sin partidos ni podio, esas
            // dos secciones simplemente no salen.
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const goLogin = () => nav('/login');
    const fanScale = isMobile ? 0.72 : 1;
    const podium = PODIUM_ORDER
        .map(rank => showcase.podium.find(p => p.rank === rank))
        .filter(Boolean);

    return (
        <MotionConfig reducedMotion="user">
            <Layout className="landing" style={{ minHeight: '100vh', background: token.colorBgBase }}>
                {/* ── Cabecera ── */}
                <Layout.Header
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        height: 64,
                        lineHeight: '64px',
                        padding: '0 24px',
                        background: token.colorBgContainer,
                        borderBottom: `1px solid ${token.colorBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                    }}
                >
                    <BrandMark logoWidth={100} crestSize={36} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
                    {!isMobile && (
                        <Space size={4}>
                            <Button type="text" onClick={() => scrollTo('como-se-juega')}>Cómo se juega</Button>
                            <Button type="text" onClick={() => scrollTo('puntuacion')}>Puntuación</Button>
                            {podium.length > 0 && (
                                <Button type="text" onClick={() => scrollTo('podio')}>Hall of Flame</Button>
                            )}
                        </Space>
                    )}
                    <Button type="primary" icon={<UserOutlined />} onClick={goLogin}>
                        Iniciar sesión
                    </Button>
                </Layout.Header>

                <Layout.Content style={{ width: '100%', maxWidth: 1120, margin: '0 auto', padding: isMobile ? '24px 16px 0' : '48px 24px 0' }}>
                    <Flex vertical gap={isMobile ? 40 : 56}>
                        {/* ── Hero ── */}
                        <section className="landing-hero">
                            <span className="landing-glow is-accent" aria-hidden="true" />
                            <span className="landing-glow is-flame" aria-hidden="true" />
                            <Row gutter={[40, 32]} align="middle">
                                <Col xs={24} lg={13}>
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                                        <Title level={1} className="landing-title">
                                            La porra del competitivo <span className="landing-title-hl">de toda la vida</span>
                                        </Title>
                                        <Paragraph type="secondary" style={{ fontSize: 17, lineHeight: 1.6, maxWidth: '50ch', marginBottom: 28 }}>
                                            Cada semana predices quién gana los partidos de LEC, First Stand, MSI y el Mundial, y por cuánto.
                                            Los plenos dan puntos, las rachas dan más, y al final del año alguien entra en el Hall of Flame.
                                        </Paragraph>
                                        <Space wrap size={12}>
                                            <Button type="primary" size="large" onClick={goLogin} style={{ height: 48, paddingInline: 24, borderRadius: 12 }}>
                                                Iniciar sesión <ArrowRightOutlined />
                                            </Button>
                                            <Button size="large" onClick={() => scrollTo('como-se-juega')} style={{ height: 48, paddingInline: 24, borderRadius: 12 }}>
                                                Cómo se juega
                                            </Button>
                                        </Space>
                                        <Text type="secondary" style={{ display: 'block', marginTop: 14, fontStyle: 'italic', opacity: 0.55 }}>
                                            Los registros están cerrados actualmente. Contacta con un administrador.
                                        </Text>
                                    </motion.div>
                                </Col>

                                <Col xs={24} lg={11}>
                                    <motion.div
                                        className="landing-fan"
                                        initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
                                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                        transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
                                        aria-label="Ejemplo de cuatro predicciones: un fallo, una pendiente, un acierto y un pleno"
                                    >
                                        {EXAMPLE_PICKS.map((p, i) => {
                                            const c = STATUS_COLORS[p.status];
                                            const x = p.x * fanScale;
                                            const rest = `translateX(${x}px) translateY(${p.y}px) rotate(${p.r}deg)`;
                                            const spread = `translateX(${x * 1.35}px) translateY(${p.y - 8}px) rotate(${p.r * 1.2}deg)`;
                                            return (
                                                <div
                                                    key={p.match}
                                                    className="landing-fan-card"
                                                    style={{
                                                        zIndex: i + 1,
                                                        transform: rest,
                                                        '--spread': spread,
                                                        backgroundImage: `linear-gradient(${c.bg}, ${c.bg})`,
                                                        border: `1px solid ${c.border}`,
                                                    }}
                                                >
                                                    <span className="match">{p.match}</span>
                                                    <span className="pick">{p.pick}</span>
                                                    <span className="score" style={{ color: c.text }}>{p.score}</span>
                                                </div>
                                            );
                                        })}
                                        <span className="landing-sticker">¡Pleno! +{MATCH_POINTS.winner + MATCH_POINTS.exactBO3}</span>
                                    </motion.div>
                                </Col>
                            </Row>
                        </section>

                        {/* ── Así es por dentro ── */}
                        <motion.section {...reveal} id="por-dentro" style={{ scrollMarginTop: 80 }}>
                            <Title level={2} style={{ marginTop: 0, marginBottom: 20 }}>Así es por dentro</Title>
                            <ScreenshotCarousel />
                        </motion.section>

                        {/* ── Próximos partidos ── */}
                        {showcase.nextMatches.length > 0 && (
                            <motion.div {...reveal}>
                                <Text type="secondary" style={SECTION_LABEL}>Se juega pronto</Text>
                                <Flex gap={12} style={{ overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
                                    {showcase.nextMatches.map(m => (
                                        <MatchCard key={m.id} match={m} isMobile={isMobile} onClick={goLogin} />
                                    ))}
                                </Flex>
                            </motion.div>
                        )}

                        {/* ── Cómo funciona ── */}
                        <motion.section {...reveal} id="como-se-juega" style={{ scrollMarginTop: 80 }}>
                            <Title level={2} style={{ marginTop: 0, marginBottom: 20 }}>Cómo se juega</Title>
                            <Row gutter={[16, 16]}>
                                {STEPS.map((s, i) => (
                                    <Col xs={24} md={8} key={s.title}>
                                        <Card className="landing-step">
                                            <span className="landing-step-num" aria-hidden="true">{i + 1}</span>
                                            <Flex vertical gap={12} style={{ position: 'relative' }}>
                                                <span className="landing-step-icon" style={{ background: s.tone.bg, color: s.tone.fg }}>
                                                    {s.icon}
                                                </span>
                                                <Text strong style={{ fontSize: 18 }}>{s.title}</Text>
                                                <Text type="secondary" style={{ fontSize: 15 }}>{s.text}</Text>
                                            </Flex>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </motion.section>

                        {/* ── Puntuación ── */}
                        <motion.section {...reveal} id="puntuacion" style={{ scrollMarginTop: 80 }}>
                            <Title level={2} style={{ marginTop: 0, marginBottom: 20 }}>Lo que vale cada cosa</Title>
                            <div className="landing-points">
                                {POINTS.map(p => (
                                    <div key={p.label} className="landing-point">
                                        <span className="landing-point-value" style={{ color: p.color }}>{p.value}</span>
                                        <Text type="secondary">{p.label}</Text>
                                    </div>
                                ))}
                            </div>
                        </motion.section>

                        {/* ── Podio ── */}
                        {podium.length > 0 && (
                            <motion.section {...reveal} id="podio" style={{ scrollMarginTop: 80 }}>
                                <Row gutter={[32, 24]} align="middle">
                                    <Col xs={24} md={10}>
                                        <Title level={2} style={{ marginTop: 0 }}>Hall of Flame</Title>
                                        <Paragraph type="secondary" style={{ fontSize: 15, maxWidth: '40ch' }}>
                                            Los que más Pachangas han ganado. Su nombre se queda aquí para siempre.
                                        </Paragraph>
                                    </Col>
                                    <Col xs={24} md={14}>
                                        <div className="landing-podium">
                                            {podium.map(p => (
                                                <div key={p.rank} className={`landing-podium-col is-${p.rank}`}>
                                                    <Avatar src={getAvatarSrc(p.logo_url)} icon={<UserOutlined />} size={p.rank === 1 ? 64 : 52} />
                                                    <Text className="landing-podium-name">{p.username}</Text>
                                                    <Tag color="gold" style={{ margin: 0 }}>{p.titles} {p.titles === 1 ? 'título' : 'títulos'}</Tag>
                                                    <div className="landing-podium-step">{p.rank}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </Col>
                                </Row>
                            </motion.section>
                        )}

                        {/* ── Cierre ── */}
                        <motion.div {...reveal} className="landing-cta">
                            <div className="landing-cta-inner">
                                <div>
                                    <Title level={3} style={{ margin: 0 }}>¿Te crees que sabes más que Guille?</Title>
                                    <Text type="secondary" style={{ fontSize: 15 }}>
                                        Pide tu cuenta a un administrador y demuéstralo cada semana.
                                    </Text>
                                </div>
                                <Button type="primary" size="large" onClick={goLogin} style={{ height: 48, paddingInline: 24, borderRadius: 12 }}>
                                    Iniciar sesión <ArrowRightOutlined />
                                </Button>
                            </div>
                        </motion.div>
                    </Flex>
                </Layout.Content>

                <Footer />
            </Layout>
        </MotionConfig>
    );
}
