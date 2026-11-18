import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Popconfirm, Select, Skeleton, Space, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { API } from '../../../services/api';
import { showAlert } from '../AlertInfo';
import { isRoundAim, matchName, matchStarted, needsTarget, playEffectText, RARITY_LABEL } from '../../../utils/cards';
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
    const active = roundPlays.filter(p => p.status === 'active');
    const perRound = hand?.effectsPerRound ?? 2;
    const effectsUsed = active.filter(p => p.card.limited).length;
    const familiesUsed = new Set(active.map(p => p.family || p.key));
    const openMatches = matches.filter(m => !matchStarted(m));
    const roundStarted = matches.length === 0 || matches.some(m => matchStarted(m));

    // La mano, agrupada: las iguales juntas («Gafe ×3») y cada carta gratis o del
    // partido aparte, porque solo vale en su jornada o en su partido. Al jugar un grupo
    // se usa la más antigua.
    const slots = useMemo(() => {
        const out = [];
        const byKey = {};
        for (const c of hand?.hand || []) {
            if (c.source === 'free') { out.push({ id: `free:${c.id}`, cards: [c], info: c, free: true }); continue; }
            if (c.source === 'match') { out.push({ id: `match:${c.id}`, cards: [c], info: c, free: false, matchCard: true }); continue; }
            if (!byKey[c.key]) { byKey[c.key] = { id: `type:${c.key}`, cards: [], info: c, free: false }; out.push(byKey[c.key]); }
            byKey[c.key].cards.push(c);
        }
        return out;
    }, [hand]);
    const slot = slots.find(s => s.id === selected) || null;
    const card = slot ? slot.cards[0] : null;

    if (!league?.cards_enabled) return null;

    const canPlay = (s) => {
        const c = s.info;
        if (familiesUsed.has(c.family || c.key)) return `Ya has jugado ${c.label} esta jornada`;
        if (c.limited && effectsUsed >= perRound) return `Ya has jugado ${perRound} cartas esta jornada`;
        if (s.free && c.round && c.round.id !== round?.roundId) return `Solo vale en la ${c.round.name || `jornada ${c.round.order}`}`;
        if (s.matchCard) {
            if (!c.match || c.match.round_id !== round?.roundId) return `Solo vale en ${matchName(c.match)}`;
            if (!openMatches.some(m => m.id === c.match.id)) return 'Su partido ya ha empezado';
        }
        if (isRoundAim(c.aim) && roundStarted) return 'La jornada ya ha empezado';
        if (!isRoundAim(c.aim) && openMatches.length === 0) return 'No quedan partidos sin empezar';
        return null;
    };
    const freeHere = slots.find(s => s.free && s.info.round?.id === round?.roundId);
    const left = Math.max(0, perRound - effectsUsed);

    const submit = async () => {
        setBusy(true);
        try {
            const body = { user_card_id: card.id };
            if (isRoundAim(card.aim)) body.round_id = round.roundId;
            else body.match_id = matchId;
            if (needsTarget(card.aim)) body.target_user_id = targetId;
            const r = await API.post('/cards/play', body);
            showAlert('success', `${card.label} jugada. Nadie la verá hasta que empiece ${isRoundAim(card.aim) ? 'la jornada' : 'su partido'}.`);
            if (r.share) setShare({ ...r.share, matchId });
            setSelected(null); setMatchId(null); setTargetId(null);
            await load();
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo jugar la carta');
        } finally {
            setBusy(false);
        }
    };

    const ready = card && (isRoundAim(card.aim)
        ? (!needsTarget(card.aim) || targetId)
        : (matchId && (!needsTarget(card.aim) || targetId)));
    const total = hand?.hand.length ?? 0;

    return (
        <Card
            className="cards-panel"
            title={
                <Space>
                    <ThunderboltOutlined />
                    <span>Tus cartas</span>
                </Space>
            }
            extra={hand && <Text type="secondary" style={{ fontSize: 12 }}>{total} {total === 1 ? 'carta' : 'cartas'} en la mano</Text>}
        >
            <Skeleton loading={loading && !hand} active paragraph={{ rows: 3 }}>
                {!hand ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No se pudieron cargar tus cartas" />
                ) : (
                    <>
                        {/* Lo que te queda esta jornada, una sola vez y no en cada carta */}
                        <div className={`cards-status${left === 0 ? ' done' : ''}`}>
                            {left === 0
                                ? `Ya has jugado tus ${perRound} cartas de esta jornada.`
                                : `Te ${left === 1 ? 'queda 1 carta' : `quedan ${left} cartas`} por jugar esta jornada (el Chivato y el Espejo aparte). Cada carta, una vez por jornada.`}
                            {freeHere && <span className="cards-status-free"> Tu carta gratis caduca si no la juegas en esta jornada.</span>}
                        </div>

                        <div className="cards-hand" role="group" aria-label="Tu mano">
                            {slots.length === 0 && (
                                <div className="card-tile empty">Sin cartas. Envía la jornada completa para ganar una.</div>
                            )}
                            {slots.map(s => {
                                const c = s.info;
                                const why = canPlay(s);
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        className={`card-tile rar-${c.rarity}${selected === s.id ? ' on' : ''}`}
                                        aria-pressed={selected === s.id}
                                        disabled={Boolean(why) || busy}
                                        title={why || c.description}
                                        onClick={() => { setSelected(selected === s.id ? null : s.id); setMatchId(s.matchCard ? c.match?.id ?? null : null); setTargetId(null); }}
                                    >
                                        <span className="card-rar">
                                            <span>{s.free ? `Gratis · J${c.round?.order ?? '?'}` : s.matchCard ? 'Del partido' : RARITY_LABEL[c.rarity] || ''}</span>
                                            {s.cards.length > 1 ? <span className="card-count">×{s.cards.length}</span> : <span className="card-gem" />}
                                        </span>
                                        <CardEmblem cardKey={c.key} />
                                        <b>{c.label}</b>
                                        <p>{s.matchCard ? `Solo en ${matchName(c.match)}` : c.short || c.description}</p>
                                    </button>
                                );
                            })}
                        </div>

                        {card && (
                            <div className="card-play-form">
                                <span className="cards-note"><b style={{ color: 'var(--text)' }}>{card.label}:</b> {card.description}</span>
                                {!isRoundAim(card.aim) && (
                                    <Select
                                        placeholder="¿En qué partido?"
                                        value={matchId}
                                        onChange={setMatchId}
                                        disabled={card.source === 'match'}
                                        options={openMatches
                                            .filter(m => card.source !== 'match' || m.id === card.match?.id)
                                            .map(m => ({ value: m.id, label: `${matchName(m)} · ${m.format}` }))}
                                    />
                                )}
                                {needsTarget(card.aim) && (
                                    <Select
                                        placeholder="¿A quién?"
                                        value={targetId}
                                        onChange={setTargetId}
                                        showSearch
                                        optionFilterProp="label"
                                        options={rivals}
                                    />
                                )}
                                {isRoundAim(card.aim) && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>Se aplica a toda la {round.name}.</Text>
                                )}
                                <Space>
                                    <Popconfirm
                                        title={`¿Jugar ${card.label}?`}
                                        description="Una carta jugada no se puede retirar."
                                        okText="Jugar"
                                        cancelText="Pensarlo"
                                        onConfirm={submit}
                                        disabled={!ready || busy}
                                    >
                                        <Button type="primary" disabled={!ready} loading={busy}>Jugar {card.label}</Button>
                                    </Popconfirm>
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
                                    const e = playEffectText(p);
                                    const m = matches.find(x => x.id === p.match_id);
                                    return (
                                        <div key={p.id} className={`play-row rar-${p.card.rarity}${p.status === 'annulled' ? ' annulled' : ''}`}>
                                            <div className="play-row-what">
                                                <b>{p.card.label}{p.status === 'annulled' ? ' · anulada' : ''}</b>
                                                <small>
                                                    {isRoundAim(p.card.aim) ? 'Toda la jornada' : matchName(m)}
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
                        )}
                    </>
                )}
            </Skeleton>
        </Card>
    );
}
