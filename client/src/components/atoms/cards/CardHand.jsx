import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Select, Skeleton, Space, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { API } from '../../../services/api';
import { showAlert } from '../AlertInfo';
import { effectText, matchName, matchStarted, RARITY_LABEL } from '../../../utils/cards';
import { CardEmblem } from './CardArt';
import '../css/cards.css';

const { Text } = Typography;

/** El reparto de votos que enseña el Chivato. */
function Share({ share, match }) {
    if (!share) return null;
    const teams = match?.Teams || [];
    return (
        <div className="share" aria-label="Reparto de votos">
            {teams.map(team => {
                const n = share.byTeam?.[team.id] || 0;
                const pct = share.total ? Math.round((n / share.total) * 100) : 0;
                return (
                    <div className="share-row" key={team.id}>
                        <b>{team.acronym || team.name}</b>
                        <div className="share-bar"><span style={{ width: `${pct}%` }} /></div>
                        <small>{pct} %</small>
                    </div>
                );
            })}
            <span className="cards-note">{share.total} {share.total === 1 ? 'voto' : 'votos'} hasta ahora</span>
        </div>
    );
}

/**
 * «Tus cartas» en Predicciones: la mano de esta liga, jugar una carta en la jornada
 * elegida y lo que ya has jugado en ella.
 *
 * Las reglas las pone el servidor (server/utils/cards.js); aquí solo se ofrece lo que
 * tiene sentido (partidos sin empezar, rivales de la liga) y se enseña lo que dice si
 * algo no vale.
 *
 * @param {Object} props
 * @param {Object} props.league - Con `id` y `cards_enabled`.
 * @param {Object} props.round - La jornada elegida (de utils/rounds.js: `roundId`, `name`).
 */
export default function CardHand({ league, round }) {
    const [hand, setHand] = useState(null);
    const [matches, setMatches] = useState([]);
    const [rivals, setRivals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [matchId, setMatchId] = useState(null);
    const [targetId, setTargetId] = useState(null);
    const [busy, setBusy] = useState(false);
    const [share, setShare] = useState(null);

    const load = useCallback(async () => {
        if (!league?.id || !round?.roundId) return;
        setLoading(true);
        try {
            const [h, ms, parts, me] = await Promise.all([
                API.get(`/cards/hand/${league.id}`),
                API.get(`/matches/getByRound/${round.roundId}`).catch(() => []),
                API.get(`/leagueParticipations/get/participants/${league.id}`).catch(() => []),
                API.getUserByToken().catch(() => null),
            ]);
            setHand(h);
            setMatches([...ms].sort((a, b) => new Date(a.date) - new Date(b.date)));
            setRivals(parts.filter(p => p.User && p.user_id !== me?.id).map(p => ({ value: p.user_id, label: p.User.username })));
        } catch {
            setHand(null);
        } finally {
            setLoading(false);
        }
    }, [league?.id, round?.roundId]);

    useEffect(() => { load(); }, [load]);
    // Cambiar de jornada deja la elección a medias sin sentido.
    useEffect(() => { setSelected(null); setMatchId(null); setTargetId(null); setShare(null); }, [round?.roundId]);

    const roundPlays = useMemo(() => (hand?.plays || []).filter(p => p.round_id === round?.roundId), [hand, round]);
    const usedEffect = roundPlays.some(p => p.status === 'active' && p.card.limited);
    const openMatches = matches.filter(m => !matchStarted(m));
    const roundStarted = matches.length === 0 || matches.some(m => matchStarted(m));
    const card = hand?.hand.find(c => c.id === selected) || null;

    if (!league?.cards_enabled) return null;

    const canPlay = (c) => {
        if (c.limited && usedEffect) return 'Ya has jugado tu carta de esta jornada';
        if (c.aim === 'round' && roundStarted) return 'La jornada ya ha empezado';
        if (c.aim !== 'round' && openMatches.length === 0) return 'No quedan partidos sin empezar';
        return null;
    };

    const submit = async () => {
        setBusy(true);
        try {
            const body = { user_card_id: card.id };
            if (card.aim === 'round') body.round_id = round.roundId;
            else body.match_id = matchId;
            if (card.aim === 'rival') body.target_user_id = targetId;
            const r = await API.post('/cards/play', body);
            showAlert('success', `${card.label} jugada. Nadie la verá hasta que empiece su partido.`);
            if (r.share) setShare({ ...r.share, matchId });
            setSelected(null); setMatchId(null); setTargetId(null);
            await load();
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo jugar la carta');
        } finally {
            setBusy(false);
        }
    };

    const withdraw = async (play) => {
        try {
            await API.delete(`/cards/play/${play.id}`);
            showAlert('success', `${play.card.label} vuelve a tu mano`);
            await load();
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo retirar la carta');
        }
    };

    const ready = card && (card.aim === 'round' || (matchId && (card.aim !== 'rival' || targetId)));
    const limit = hand?.handLimit ?? 3;

    return (
        <Card
            className="cards-panel"
            title={
                <Space>
                    <ThunderboltOutlined />
                    <span>Tus cartas</span>
                </Space>
            }
            extra={hand && <Text type="secondary" style={{ fontSize: 12 }}>{hand.hand.length} de {limit} en la mano</Text>}
        >
            <Skeleton loading={loading && !hand} active paragraph={{ rows: 3 }}>
                {!hand ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No se pudieron cargar tus cartas" />
                ) : (
                    <>
                        <p className="cards-note" style={{ margin: '0 0 10px' }}>
                            Una carta por jornada (el Chivato aparte). Se juega hasta que empieza su partido y nadie la ve hasta entonces.
                            Cada jornada completa te da una gratis.
                        </p>

                        <div className="cards-hand" role="group" aria-label="Tu mano">
                            {hand.hand.length === 0 && (
                                <div className="card-tile empty">Sin cartas. Envía la jornada completa para ganar una.</div>
                            )}
                            {hand.hand.map(c => {
                                const why = canPlay(c);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className={`card-tile rar-${c.rarity}${selected === c.id ? ' on' : ''}`}
                                        aria-pressed={selected === c.id}
                                        disabled={Boolean(why) || busy}
                                        title={why || c.description}
                                        onClick={() => { setSelected(selected === c.id ? null : c.id); setMatchId(null); setTargetId(null); }}
                                    >
                                        <span className="card-rar">
                                            <span>{RARITY_LABEL[c.rarity] || ''}</span>
                                            {c.source === 'free' ? <span className="card-tag">gratis</span> : <span className="card-gem" />}
                                        </span>
                                        <CardEmblem cardKey={c.key} />
                                        <b>{c.label}</b>
                                        <p>{c.description}</p>
                                        {why && <p className="card-why">{why}</p>}
                                    </button>
                                );
                            })}
                        </div>

                        {card && (
                            <div className="card-play-form">
                                <span className="cards-note"><b style={{ color: 'var(--text)' }}>{card.label}:</b> {card.description}</span>
                                {card.aim !== 'round' && (
                                    <Select
                                        placeholder="¿En qué partido?"
                                        value={matchId}
                                        onChange={setMatchId}
                                        options={openMatches.map(m => ({ value: m.id, label: `${matchName(m)} · ${m.format}` }))}
                                    />
                                )}
                                {card.aim === 'rival' && (
                                    <Select
                                        placeholder="¿A quién?"
                                        value={targetId}
                                        onChange={setTargetId}
                                        showSearch
                                        optionFilterProp="label"
                                        options={rivals}
                                    />
                                )}
                                {card.aim === 'round' && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>Se aplica a toda la {round.name}.</Text>
                                )}
                                <Space>
                                    <Button type="primary" disabled={!ready} loading={busy} onClick={submit}>Jugar {card.label}</Button>
                                    <Button onClick={() => setSelected(null)}>Cancelar</Button>
                                </Space>
                            </div>
                        )}

                        {share && (
                            <div className="card-play-form">
                                <span className="cards-sub" style={{ margin: 0 }}>Chivato · {matchName(matches.find(m => m.id === share.matchId))}</span>
                                <Share share={share} match={matches.find(m => m.id === share.matchId)} />
                            </div>
                        )}

                        <div className="cards-sub" style={{ marginTop: 16 }}>En esta jornada</div>
                        {roundPlays.length === 0 ? (
                            <span className="cards-note">Aún no has jugado ninguna carta en la {round?.name}.</span>
                        ) : (
                            <div className="plays">
                                {roundPlays.map(p => {
                                    const e = effectText(p.effect);
                                    const m = matches.find(x => x.id === p.match_id);
                                    return (
                                        <div key={p.id} className={`play-row rar-${p.card.rarity}${p.status === 'annulled' ? ' annulled' : ''}`}>
                                            <div className="play-row-what">
                                                <b>{p.card.label}{p.status === 'annulled' ? ' · anulada' : ''}</b>
                                                <small>
                                                    {p.card.aim === 'round' ? 'Toda la jornada' : matchName(m)}
                                                    {p.target ? ` · a ${p.target.username}` : ''}
                                                </small>
                                            </div>
                                            <div className="play-row-side">
                                                {p.key !== 'chivato' && <span className={`play-effect ${e.cls}`}>{e.text}</span>}
                                                {!p.locked && p.key !== 'chivato' && p.status === 'active' && (
                                                    <Button size="small" onClick={() => withdraw(p)}>Retirar</Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </Skeleton>
        </Card>
    );
}
