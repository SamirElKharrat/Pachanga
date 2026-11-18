import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Empty, Skeleton, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { API } from '../../../services/api';
import { showAlert } from '../AlertInfo';
import { CardEmblem } from './CardArt';
import { RARITY_LABEL, playEffectText } from '../../../utils/cards';
import '../css/cards.css';

const { Text } = Typography;

/** Las cartas de una mano agrupadas por tipo; la gratis, aparte (solo vale en su jornada). */
function group(hand) {
    const out = [];
    const byKey = {};
    for (const c of hand) {
        if (c.source === 'free') { out.push({ id: `free:${c.id}`, info: c, count: 1, free: true }); continue; }
        if (!byKey[c.key]) { byKey[c.key] = { id: `type:${c.key}`, info: c, count: 0, free: false }; out.push(byKey[c.key]); }
        byKey[c.key].count += 1;
    }
    return out;
}

/**
 * La pestaña «Cartas» del perfil: las cartas que tienes en cada liga (agrupadas por
 * tipo, la mano no tiene límite), tu carta gratis de la jornada y lo que has jugado.
 * Para jugarlas, Predicciones.
 */
export default function ProfileCards() {
    const nav = useNavigate();
    const [leagues, setLeagues] = useState(null);

    const load = useCallback(async () => {
        try {
            const shop = await API.get('/shop');
            const hands = await Promise.all(shop.cardLeagues.map(l =>
                API.get(`/cards/hand/${l.id}`).then(h => ({ league: l, hand: h.hand || [], plays: h.plays || [], perRound: h.effectsPerRound ?? 2 })).catch(() => null)));
            setLeagues(hands.filter(Boolean));
        } catch {
            showAlert('error', 'No se pudieron cargar tus cartas');
            setLeagues([]);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (!leagues) return <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>;
    if (leagues.length === 0) {
        return (
            <Card>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Ahora mismo no juegas ninguna liga con cartas." />
            </Card>
        );
    }

    return (
        <div className="pcards">
            {leagues.map(({ league, hand, plays, perRound }) => {
                const slots = group(hand);
                const free = slots.find(s => s.free);
                return (
                    <Card
                        key={league.id}
                        className="shop-section"
                        title={league.name}
                        extra={<Text type="secondary" style={{ fontSize: 12 }}>{hand.length} {hand.length === 1 ? 'carta' : 'cartas'}</Text>}
                    >
                        <p className="cards-note" style={{ margin: '0 0 12px' }}>
                            Puedes jugar {perRound} cartas por jornada (el Chivato aparte) y cada una, una vez por jornada.
                            {free && <> Tu <b>{free.info.label}</b> gratis es de la jornada {free.info.round?.order ?? '?'}: si no la juegas ahí, caduca.</>}
                        </p>

                        {slots.length === 0 ? (
                            <Text type="secondary" style={{ fontSize: 12.5 }}>Sin cartas. Envía una jornada completa para ganar una, o cómpralas en la tienda.</Text>
                        ) : (
                            <div className="pcards-grid">
                                {slots.map(s => (
                                    <div key={s.id} className={`card-tile static rar-${s.info.rarity}`} title={s.info.description}>
                                        <span className="card-rar">
                                            <span>{s.free ? `Gratis · J${s.info.round?.order ?? '?'}` : RARITY_LABEL[s.info.rarity] || ''}</span>
                                            {s.count > 1 ? <span className="card-count">×{s.count}</span> : <span className="card-gem" />}
                                        </span>
                                        <CardEmblem cardKey={s.info.key} />
                                        <b>{s.info.label}</b>
                                        <p>{s.info.short || s.info.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {plays.length > 0 && (
                            <>
                                <div className="cards-sub" style={{ marginTop: 16 }}>Lo que has jugado</div>
                                <div className="plays">
                                    {plays.slice(0, 8).map(p => {
                                        const e = playEffectText(p);
                                        return (
                                            <div key={p.id} className={`play-row rar-${p.card.rarity}${p.status === 'annulled' ? ' annulled' : ''}`}>
                                                <div className="play-row-what">
                                                    <b>{p.card.label}{p.status === 'annulled' ? ' · anulada' : ''}</b>
                                                    <small>
                                                        {p.round_order ? `Jornada ${p.round_order}` : ''}
                                                        {p.target ? ` · a ${p.target.username}` : ''}
                                                    </small>
                                                </div>
                                                <div className="play-row-side">
                                                    {p.key !== 'chivato' && <span className={`play-effect ${e.cls}`}>{e.text}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        <div style={{ marginTop: 14 }}>
                            <Button type="primary" ghost size="small" onClick={() => nav('/predictions')}>Jugar en Predicciones</Button>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
