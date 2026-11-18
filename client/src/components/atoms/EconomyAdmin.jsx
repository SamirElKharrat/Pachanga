import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, Progress, Row, Segmented, Select, Skeleton, Statistic, Table, Tag, Typography } from 'antd';
import { API } from '../../services/api';
import { showAlert } from './AlertInfo';
import './css/economy.css';

const { Text } = Typography;

const RARITY_COLOR = { comun: '#94a3b8', poco: '#10b981', raro: '#3b82f6', epico: '#a855f7', leg: '#d4a843' };
const CARD_ORDER = ['escudo', 'gafe', 'doble', 'dorada', 'chivato'];
const SOURCE_LABEL = { free: 'Carta gratis', shop: 'Tienda', chest: 'Cofre', admin: 'Panel' };

/**
 * El panel de economía (fase 5 de cartas y cofres): monedas, tienda, cofres y
 * cartas de una liga, para decidir si hay que tocar precios o ingresos.
 *
 * Los precios e ingresos se cambian solo entre ligas, nunca a mitad de una.
 */
export default function EconomyAdmin() {
    const [days, setDays] = useState(30);
    const [leagueId, setLeagueId] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ days: String(days) });
            if (leagueId) qs.set('league_id', String(leagueId));
            const d = await API.get(`/economy?${qs}`);
            setData(d);
            if (!leagueId && d.cards?.leagueId) setLeagueId(d.cards.leagueId);
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo cargar la economía');
        } finally {
            setLoading(false);
        }
    }, [days, leagueId]);

    useEffect(() => { load(); }, [load]);

    if (!data) return <Skeleton active paragraph={{ rows: 10 }} />;

    const { coins, flows, chests, cards, purchases } = data;
    const maxBucket = Math.max(1, ...coins.buckets.map(b => b.count));
    const capWarning = coins.atCapPct >= 25;

    const flowColumns = [
        { title: 'Motivo', dataIndex: 'label' },
        { title: 'Entra', dataIndex: 'earned', align: 'right', render: v => (v ? <span className="eco-up">+{v}</span> : '—') },
        { title: 'Sale', dataIndex: 'spent', align: 'right', render: v => (v ? <span className="eco-down">−{v}</span> : '—') },
        { title: 'Neto', dataIndex: 'net', align: 'right', render: v => <b>{v > 0 ? `+${v}` : v}</b> },
        { title: 'Movimientos', dataIndex: 'count', align: 'right' },
    ];

    const chestColumns = [
        { title: 'Rareza', dataIndex: 'label', render: (v, r) => <span style={{ color: RARITY_COLOR[r.rarity], fontWeight: 600 }}>{v}</span> },
        { title: 'Publicado', dataIndex: 'published', align: 'right', render: v => `${String(v).replace('.', ',')} %` },
        { title: 'Sale de verdad', dataIndex: 'observed', align: 'right', render: v => `${String(v).replace('.', ',')} %` },
        { title: 'Aperturas', dataIndex: 'count', align: 'right' },
    ];

    const roundColumns = [
        { title: 'Jornada', dataIndex: 'round', render: v => `J${v}` },
        ...CARD_ORDER.map(k => ({ title: data.catalog[k], dataIndex: k, align: 'right', render: v => v || '—' })),
        { title: 'Total', dataIndex: 'total', align: 'right', render: v => <b>{v}</b> },
    ];

    const playerColumns = [
        { title: 'Jugador', dataIndex: 'username' },
        { title: 'Puntos de cartas', dataIndex: 'points_card', align: 'right', render: v => <b className={v > 0 ? 'eco-up' : v < 0 ? 'eco-down' : ''}>{v > 0 ? `+${v}` : v}</b> },
        { title: 'Total en la liga', dataIndex: 'points', align: 'right' },
        { title: '% de cartas', align: 'right', render: (_, r) => (r.points ? `${Math.round((r.points_card / r.points) * 100)} %` : '—') },
    ];

    return (
        <div className="eco">
            <div className="eco-head">
                <Text type="secondary">Movimientos de los últimos</Text>
                <Segmented
                    value={days}
                    onChange={setDays}
                    options={[{ label: '7 días', value: 7 }, { label: '30 días', value: 30 }, { label: 'Siempre', value: 0 }]}
                />
            </div>

            {capWarning && (
                <Alert
                    type="warning"
                    showIcon
                    message={`El ${coins.atCapPct} % de la gente está en el techo de ${data.cap}`}
                    description="Sobran monedas: para la próxima liga, sube precios o baja lo que se gana. Nunca a mitad de una liga."
                />
            )}

            <Row gutter={[12, 12]}>
                <Col xs={12} lg={6}><Card size="small"><Statistic title="Monedas en circulación" value={coins.total} /><Text type="secondary" className="eco-sub">entre {coins.players} jugadores</Text></Card></Col>
                <Col xs={12} lg={6}><Card size="small"><Statistic title="Saldo medio" value={coins.average} precision={1} /><Text type="secondary" className="eco-sub">mediana {coins.median}</Text></Card></Col>
                <Col xs={12} lg={6}><Card size="small"><Statistic title={`En el techo (${data.cap})`} value={coins.atCapPct} suffix="%" /><Text type="secondary" className="eco-sub">{coins.atCap} de {coins.players}</Text></Card></Col>
                <Col xs={12} lg={6}><Card size="small"><Statistic title="Cofres abiertos" value={chests.opened} /><Text type="secondary" className="eco-sub">devuelven {chests.coinsBack} de {chests.spent} monedas</Text></Card></Col>
            </Row>

            <Row gutter={[12, 12]}>
                <Col xs={24} lg={14}>
                    <Card size="small" title="Cómo se reparten los saldos">
                        <div className="eco-bars">
                            {coins.buckets.map(b => (
                                <div key={b.label} className="eco-bar">
                                    <span className="eco-bar-label">{b.label}</span>
                                    <Progress percent={(b.count / maxBucket) * 100} showInfo={false} strokeColor="var(--accent)" size="small" />
                                    <span className="eco-bar-n">{b.count}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={10}>
                    <Card size="small" title="Saldos más altos">
                        {coins.top.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nadie tiene monedas todavía" /> : (
                            <ol className="eco-top">
                                {coins.top.map(u => (
                                    <li key={u.id}><span>{u.username}</span><b>{u.balance}</b></li>
                                ))}
                            </ol>
                        )}
                    </Card>
                </Col>
            </Row>

            <Card size="small" title="Qué entra y qué sale" extra={<Text type="secondary" style={{ fontSize: 12 }}>Entra {flows.earned} · sale {flows.spent} · neto {flows.net > 0 ? `+${flows.net}` : flows.net}</Text>}>
                <Table rowKey="reason" size="small" pagination={false} loading={loading} dataSource={flows.byReason} columns={flowColumns} scroll={{ x: 'max-content' }} />
            </Card>

            <Row gutter={[12, 12]}>
                <Col xs={24} lg={12}>
                    <Card size="small" title="Tienda: lo más comprado">
                        {purchases.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin compras en este periodo" /> : (
                            <Table
                                rowKey="id" size="small" pagination={{ pageSize: 8, size: 'small' }} dataSource={purchases}
                                columns={[
                                    { title: 'Artículo', dataIndex: 'label' },
                                    { title: 'Tipo', dataIndex: 'kind', render: v => <Tag>{v}</Tag> },
                                    { title: 'Compras', dataIndex: 'count', align: 'right' },
                                ]}
                            />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card size="small" title="Cofres: lo que sale" extra={chests.guaranteed > 0 && <Text type="secondary" style={{ fontSize: 12 }}>{chests.guaranteed} por la garantía</Text>}>
                        <Table rowKey="rarity" size="small" pagination={false} dataSource={chests.byRarity} columns={chestColumns} />
                        <Text type="secondary" className="eco-sub">Con pocas aperturas lo observado se aleja de lo publicado: es normal.</Text>
                    </Card>
                </Col>
            </Row>

            <Card
                size="small"
                title="Cartas"
                extra={data.cardLeagues.length > 0 && (
                    <Select
                        size="small" value={leagueId} onChange={setLeagueId} style={{ minWidth: 200 }}
                        options={data.cardLeagues.map(l => ({ value: l.id, label: `${l.name}${l.status === 'finished' ? ' (terminada)' : ''}` }))}
                    />
                )}
            >
                {!cards ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Ninguna liga tiene las cartas activadas" /> : (
                    <div className="eco-cards">
                        <div className="eco-sources">
                            {Object.entries(cards.sources).map(([k, n]) => <Tag key={k}>{SOURCE_LABEL[k] || k}: {n}</Tag>)}
                        </div>
                        <Text strong>Cartas jugadas por jornada</Text>
                        <Table rowKey="round" size="small" pagination={false} dataSource={cards.byRound} columns={roundColumns} scroll={{ x: 'max-content' }}
                            locale={{ emptyText: 'Aún no se ha jugado ninguna carta' }} />
                        <Text strong>Puntos de cartas por jugador</Text>
                        <Table rowKey="id" size="small" pagination={{ pageSize: 10, size: 'small' }} dataSource={cards.perPlayer} columns={playerColumns} scroll={{ x: 'max-content' }} />
                        <Text type="secondary" className="eco-sub">Si las cartas pesan mucho en el total de alguien (más de un 15–20 %), conviene revisar topes o precios para la próxima liga.</Text>
                    </div>
                )}
            </Card>
        </div>
    );
}
