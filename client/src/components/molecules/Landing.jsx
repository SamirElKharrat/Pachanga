import React, { useEffect, useState } from 'react';
import { Layout, Card, Row, Col, Typography, Button, Avatar, Tag, List, Flex, Space, theme } from 'antd';
import { UserOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { API } from '../../services/api';
import { useTheme as useAppTheme } from '../../context/ThemeContext';
import useIsMobile from '../../hooks/useIsMobile';
import BrandMark from '../atoms/BrandMark';
import MatchCard from '../atoms/MatchCard';
import Footer from '../atoms/Footer';
import { STATUS_COLORS, RANK_STYLES, QUESTION_POINTS, MATCH_POINTS } from '../../constants/pachanga';

const { Title, Text, Paragraph } = Typography;

const SECTION_LABEL = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
};

/**
 * Una jornada de ejemplo para la tarjeta del hero. Son datos inventados, y la
 * tarjeta lo dice: la portada no enseña predicciones de nadie de verdad.
 */
const EXAMPLE_PICKS = [
    { match: 'G2 vs FNC', pick: 'G2', score: '2-1', status: 'correct' },
    { match: 'KC vs VIT', pick: 'KC', score: '2-1', status: 'partial' },
    { match: 'BDS vs TH', pick: 'BDS', score: '2-0', status: 'wrong' },
    { match: 'SK vs GX', pick: 'GX', score: '0-2', status: 'pending' },
];

const LEGEND = [
    { status: 'correct', label: 'Pleno' },
    { status: 'partial', label: 'Acierto' },
    { status: 'wrong', label: 'Fallo' },
    { status: 'pending', label: 'Pendiente' },
];

const STEPS = [
    {
        title: 'Predice la jornada',
        text: 'Elige ganador y marcador de cada partido antes de que empiece. Puedes cambiarlo hasta el inicio.',
    },
    {
        title: 'Suma con cada resultado',
        text: 'En Inicio ves al momento cómo le fue a cada uno: verde si es pleno, ámbar si aciertas el ganador, rojo si fallas.',
    },
    {
        title: 'Gana la Pachanga',
        text: 'Cada liga reparte puntos a la clasificación del año. El campeón se queda para siempre en el Hall of Flame.',
    },
];

const SCORING = [
    { label: 'Aciertas el ganador', value: `+${MATCH_POINTS.winner}`, color: 'gold' },
    { label: 'Pleno en un BO3 (marcador exacto)', value: `+${MATCH_POINTS.exactBO3}`, color: 'green' },
    { label: 'Pleno en un BO5', value: `+${MATCH_POINTS.exactBO5}`, color: 'green' },
    { label: 'Pleno con tu equipo favorito', value: `+${MATCH_POINTS.favoriteOnExact}`, color: 'blue' },
    {
        label: `Rachas de ${MATCH_POINTS.streak.map(s => s.length).join(', ').replace(/, (\d+)$/, ' y $1')} plenos en la semana`,
        value: MATCH_POINTS.streak.map(s => `+${s.bonus}`).join(' · '),
        color: 'orange',
    },
    { label: 'Pregunta semanal acertada', value: `+${QUESTION_POINTS}`, color: 'blue' },
];

/** Lleva a una sección de la portada. Los anclajes no sirven: el router se los come. */
const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/**
 * La portada: lo que ve quien entra en la web sin sesión.
 *
 * Cuenta qué es la Pachanga y cuánto vale cada acierto, y enseña dos cosas vivas
 * que salen de un endpoint público: los próximos partidos y el podio del año. Nada
 * más. Las predicciones de la gente no salen de dentro de la web.
 *
 * Quien ya tiene sesión nunca llega aquí: en `/` le recibe Inicio, como siempre.
 */
export default function Landing() {
    const nav = useNavigate();
    const { token } = theme.useToken();
    const { getAvatarSrc } = useAppTheme();
    const isMobile = useIsMobile(768);
    const [showcase, setShowcase] = useState({ podium: [], nextMatches: [], year: new Date().getFullYear() });

    useEffect(() => {
        let cancelled = false;
        API.get('/pachanga/showcase')
            .then(data => {
                if (cancelled || !data) return;
                setShowcase({
                    year: data.year,
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

    return (
        <Layout style={{ minHeight: '100vh', background: token.colorBgBase }}>
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
                        {showcase.podium.length > 0 && (
                            <Button type="text" onClick={() => scrollTo('puntuacion')}>Clasificación</Button>
                        )}
                    </Space>
                )}
                <Button type="primary" icon={<UserOutlined />} onClick={goLogin}>
                    Iniciar sesión
                </Button>
            </Layout.Header>

            <Layout.Content style={{ width: '100%', maxWidth: 1120, margin: '0 auto', padding: isMobile ? '24px 16px 0' : '40px 24px 0' }}>
                <Flex vertical gap={24}>
                    {/* ── Hero ── */}
                    <Row gutter={[32, 24]} align="middle">
                        <Col xs={24} lg={13}>
                            <Text type="secondary" style={SECTION_LABEL}>Predicciones de LoL entre amigos</Text>
                            <Title level={1} style={{ marginTop: 0 }}>La porra del competitivo de toda la vida</Title>
                            <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: '50ch', marginBottom: 24 }}>
                                Cada semana predices quién gana los partidos de LEC, LCK, LPL y el Mundial, y por cuánto.
                                Los plenos dan puntos, las rachas dan más, y al final del año alguien entra en el Hall of Flame.
                            </Paragraph>
                            <Space wrap size={12}>
                                <Button type="primary" size="large" onClick={goLogin}>
                                    Iniciar sesión <ArrowRightOutlined />
                                </Button>
                                <Button size="large" onClick={() => scrollTo('como-se-juega')}>Cómo se juega</Button>
                            </Space>
                            <Text type="secondary" style={{ display: 'block', marginTop: 12, fontStyle: 'italic', opacity: 0.5 }}>
                                Los registros están cerrados actualmente. Contacta con un administrador.
                            </Text>
                        </Col>

                        <Col xs={24} lg={11}>
                            <Card
                                title="Así se ve una jornada"
                                extra={<Text type="secondary" style={{ fontSize: 12 }}>ejemplo</Text>}
                                styles={{ body: { padding: 16 } }}
                            >
                                <Flex vertical gap={14}>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))',
                                            gap: 10,
                                        }}
                                    >
                                        {EXAMPLE_PICKS.map(p => {
                                            const c = STATUS_COLORS[p.status];
                                            return (
                                                <Flex
                                                    key={p.match}
                                                    vertical
                                                    align="center"
                                                    justify="center"
                                                    gap={4}
                                                    style={{
                                                        minHeight: 100,
                                                        padding: '8px 4px',
                                                        background: c.bg,
                                                        border: `1px solid ${c.border}`,
                                                        borderRadius: 10,
                                                    }}
                                                >
                                                    <Text type="secondary" style={{ fontSize: 9, fontWeight: 800, opacity: 0.6 }}>
                                                        {p.match}
                                                    </Text>
                                                    <Text strong style={{ fontSize: 18 }}>{p.pick}</Text>
                                                    <Text style={{ fontSize: 11, color: c.text, fontWeight: 800, lineHeight: 1 }}>
                                                        {p.score}
                                                    </Text>
                                                </Flex>
                                            );
                                        })}
                                    </div>
                                    <Space wrap size={12}>
                                        {LEGEND.map(l => (
                                            <Space key={l.status} size={6}>
                                                <span
                                                    style={{
                                                        display: 'block',
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: 3,
                                                        background: STATUS_COLORS[l.status].bg,
                                                        border: `1px solid ${STATUS_COLORS[l.status].border}`,
                                                    }}
                                                />
                                                <Text type="secondary" style={{ fontSize: 12 }}>{l.label}</Text>
                                            </Space>
                                        ))}
                                    </Space>
                                </Flex>
                            </Card>
                        </Col>
                    </Row>

                    {/* ── Próximos partidos ── */}
                    {showcase.nextMatches.length > 0 && (
                        <div>
                            <Text type="secondary" style={SECTION_LABEL}>Próximos Partidos</Text>
                            <Flex gap={12} style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
                                {showcase.nextMatches.map(m => (
                                    <MatchCard key={m.id} match={m} isMobile={isMobile} onClick={goLogin} />
                                ))}
                            </Flex>
                        </div>
                    )}

                    {/* ── Cómo funciona ── */}
                    <div id="como-se-juega" style={{ scrollMarginTop: 80 }}>
                        <Text type="secondary" style={SECTION_LABEL}>Cómo funciona</Text>
                        <Row gutter={[12, 12]}>
                            {STEPS.map((s, i) => (
                                <Col xs={24} md={8} key={s.title}>
                                    <Card style={{ height: '100%' }}>
                                        <Flex vertical gap={8}>
                                            <Flex
                                                align="center"
                                                justify="center"
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 8,
                                                    fontWeight: 800,
                                                    background: 'rgba(var(--accent-rgb), 0.15)',
                                                    color: 'var(--accent)',
                                                }}
                                            >
                                                {i + 1}
                                            </Flex>
                                            <Text strong style={{ fontSize: 16 }}>{s.title}</Text>
                                            <Text type="secondary">{s.text}</Text>
                                        </Flex>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>

                    {/* ── Puntuación y podio ── */}
                    <Row gutter={[12, 12]} id="puntuacion" style={{ scrollMarginTop: 80 }}>
                        <Col xs={24} lg={showcase.podium.length > 0 ? 12 : 24}>
                            <Card title="Puntuación" styles={{ body: { padding: '4px 24px' } }}>
                                <List
                                    dataSource={SCORING}
                                    renderItem={item => (
                                        <List.Item extra={<Tag color={item.color} style={{ margin: 0 }}>{item.value}</Tag>}>
                                            <Text>{item.label}</Text>
                                        </List.Item>
                                    )}
                                />
                            </Card>
                        </Col>
                        {showcase.podium.length > 0 && (
                            <Col xs={24} lg={12}>
                                <Card title={`Clasificación ${showcase.year}`} styles={{ body: { padding: 0 } }}>
                                    <List
                                        dataSource={showcase.podium}
                                        renderItem={item => {
                                            const rankStyle = RANK_STYLES[item.rank] ?? RANK_STYLES.default;
                                            return (
                                                <List.Item style={{ padding: '10px 12px' }}>
                                                    <Flex align="center" gap={8} style={{ width: '100%' }}>
                                                        <Flex
                                                            align="center"
                                                            justify="center"
                                                            style={{
                                                                width: 26,
                                                                height: 26,
                                                                background: rankStyle.bg,
                                                                borderRadius: 6,
                                                                fontWeight: 800,
                                                                fontSize: 11,
                                                                color: item.rank <= 3 ? 'var(--black)' : 'var(--white)',
                                                                boxShadow: rankStyle.glow ? `0 0 8px ${rankStyle.glow}` : 'none',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {item.rank}
                                                        </Flex>
                                                        <Avatar src={getAvatarSrc(item.logo_url)} icon={<UserOutlined />} size={32} />
                                                        <Text strong ellipsis style={{ flex: 1, minWidth: 0 }}>{item.username}</Text>
                                                        <Tag color="gold" style={{ margin: 0 }}>{item.totalPoints} pts</Tag>
                                                    </Flex>
                                                </List.Item>
                                            );
                                        }}
                                    />
                                </Card>
                            </Col>
                        )}
                    </Row>
                </Flex>
            </Layout.Content>

            <Footer />
        </Layout>
    );
}
