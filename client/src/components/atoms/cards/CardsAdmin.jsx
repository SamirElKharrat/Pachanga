import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Popconfirm, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { API } from '../../../services/api';
import { showAlert } from '../AlertInfo';
import { effectText } from '../../../utils/cards';
import '../css/cards.css';

const { Text } = Typography;

/**
 * Cartas en el panel de admin: en una liga, dar cartas a mano y ver (y anular) todo
 * lo jugado. Activar las cartas en una liga se hace en la pestaña Ligas.
 *
 * Anular una jugada la deja sin efecto (la carta no vuelve) y vuelve a puntuar su
 * jornada: la clasificación se mueve sola.
 */
export default function CardsAdmin() {
    const [leagues, setLeagues] = useState([]);
    const [leagueId, setLeagueId] = useState(null);
    const [catalog, setCatalog] = useState([]);
    const [players, setPlayers] = useState([]);
    const [plays, setPlays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState(null);
    const [card, setCard] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([API.get('/leagues/get'), API.get('/cards/catalog')])
            .then(([ls, cat]) => {
                const list = (Array.isArray(ls) ? ls : []).sort((a, b) => b.id - a.id);
                setLeagues(list);
                setCatalog(Array.isArray(cat) ? cat : []);
                const first = list.find(l => l.cards_enabled) || list[0];
                if (first) setLeagueId(first.id);
            })
            .catch(() => showAlert('error', 'No se pudieron cargar las ligas'));
    }, []);

    const load = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        try {
            const [ps, parts] = await Promise.all([
                API.get(`/cards/league/${id}`),
                API.get(`/leagueParticipations/get/participants/${id}`).catch(() => []),
            ]);
            setPlays(Array.isArray(ps) ? ps : []);
            setPlayers(parts.filter(p => p.User).map(p => ({ value: p.user_id, label: p.User.username })));
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudieron cargar las jugadas');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(leagueId); setUserId(null); }, [leagueId, load]);

    const league = leagues.find(l => l.id === leagueId);

    const grant = async () => {
        setSaving(true);
        try {
            await API.post('/cards/grant', { user_id: userId, league_id: leagueId, card });
            const label = catalog.find(c => c.key === card)?.label || card;
            showAlert('success', `${label} dada`);
            setCard(null);
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo dar la carta');
        } finally {
            setSaving(false);
        }
    };

    const annul = async (play) => {
        try {
            await API.post(`/cards/annul/${play.id}`);
            showAlert('success', 'Jugada anulada: la jornada se ha vuelto a puntuar');
            await load(leagueId);
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo anular');
        }
    };

    const columns = [
        { title: 'Jornada', dataIndex: 'round_order', width: 80, render: (v) => (v ? `J${v}` : '—') },
        { title: 'Jugador', render: (_, p) => p.user?.username || '—' },
        {
            title: 'Carta',
            render: (_, p) => (
                <span className={`rar-${p.card.rarity}`} style={{ color: 'var(--rc)', fontWeight: 600 }}>{p.card.label}</span>
            ),
        },
        { title: 'Contra', render: (_, p) => p.target?.username || '' },
        {
            title: 'Vale',
            render: (_, p) => {
                if (p.key === 'chivato') return <Text type="secondary">—</Text>;
                const e = effectText(p.effect);
                return <span className={`play-effect ${e.cls}`}>{e.text}</span>;
            },
        },
        {
            title: '',
            width: 110,
            render: (_, p) => (p.status === 'annulled'
                ? <Tag>Anulada</Tag>
                : (
                    <Popconfirm
                        title="¿Anular esta jugada?"
                        description="Deja de contar, la carta no vuelve y la jornada se vuelve a puntuar."
                        okText="Anular"
                        cancelText="Cancelar"
                        onConfirm={() => annul(p)}
                    >
                        <Button size="small" danger>Anular</Button>
                    </Popconfirm>
                )),
        },
    ];

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Select
                placeholder="Elige una liga"
                value={leagueId}
                onChange={setLeagueId}
                showSearch
                optionFilterProp="label"
                options={leagues.map(l => ({ value: l.id, label: `${l.name}${l.cards_enabled ? ' · con cartas' : ''}` }))}
                style={{ width: '100%', maxWidth: 420 }}
            />
            {league && !league.cards_enabled && (
                <Alert
                    type="info"
                    showIcon
                    message="Esta liga no juega cartas"
                    description="Se activa editando la liga en la pestaña Ligas (Cards Enabled). Mientras esté apagado nadie puede jugar, aunque se puedan dar cartas."
                />
            )}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}>
                    <Card size="small" title="Dar una carta">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Select placeholder="Jugador" value={userId} onChange={setUserId} options={players} showSearch optionFilterProp="label" style={{ width: '100%' }} />
                            <Select
                                placeholder="Carta"
                                value={card}
                                onChange={setCard}
                                options={catalog.map(c => ({ value: c.key, label: c.label }))}
                                style={{ width: '100%' }}
                            />
                            <Button type="primary" disabled={!userId || !card} loading={saving} onClick={grant}>Dar carta</Button>
                            <Text type="secondary" style={{ fontSize: 12 }}>La mano no tiene límite.</Text>
                        </Space>
                    </Card>
                </Col>
                <Col xs={24} lg={16}>
                    <Card size="small" title="Cartas jugadas">
                        {plays.length === 0 && !loading ? (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aún no se ha jugado ninguna carta en esta liga" />
                        ) : (
                            <Table
                                rowKey="id"
                                size="small"
                                loading={loading}
                                dataSource={plays}
                                columns={columns}
                                pagination={{ pageSize: 10, size: 'small' }}
                                scroll={{ x: 'max-content' }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>
        </Space>
    );
}
