import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Modal, Popconfirm, Segmented, Select, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { API } from '../../../services/api';
import { showAlert } from '../AlertInfo';
import { refreshCoins } from '../../../hooks/useCoins';
import { useTheme } from '../../../context/ThemeContext';
import { CoinIcon } from '../CoinBalance';
import { duelSound } from './duelSound';
import '../css/duels.css';

const { Text } = Typography;

/** Aviso para que las demás piezas (Inicio, el aviso a pantalla completa) se pongan al día. */
export const DUELS_EVENT = 'pachanga:duels-updated';
export const announceDuels = () => window.dispatchEvent(new Event(DUELS_EVENT));

/** «3 puntos», «10 pachanguitas». */
export const stakeText = (d) => (d.stake_kind === 'points'
    ? `${d.stake} ${d.stake === 1 ? 'punto' : 'puntos'}`
    : `${d.stake} pachanguitas`);

const roundName = (r) => r?.name || (r?.order ? `Jornada ${r.order}` : 'la jornada');

/** La bandera blanca: rendirse antes de empezar. */
export const WhiteFlag = () => (
    <svg viewBox="0 0 24 24" className="flag-ico" aria-hidden="true">
        <path d="M5 21V4" />
        <path d="M5 4c3-1.6 5 1.6 8 0s4-1 6 0v8c-2-1-3-1.6-6 0s-5-1.6-8 0z" />
    </svg>
);

/** Las espadas cruzadas del duelo. */
export const Swords = () => (
    <svg viewBox="0 0 24 24" className="duel-ico" aria-hidden="true">
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" /><path d="M19 21l2-2" />
        <path d="M9.5 6.5L13 3h3v3l-3.5 3.5" /><path d="M5 14l4 4" /><path d="M7 17l-3 3" /><path d="M3 19l2 2" />
    </svg>
);

/**
 * Tu duelo de la jornada, en Inicio, debajo de tus cartas: el marcador si lo tienes,
 * los retos que te esperan y el botón para retar a alguien.
 *
 * Las reglas las pone el servidor (server/utils/duels.js): un duelo por jornada, se
 * reta antes del primer partido y gana quien haga más puntos en ella.
 *
 * @param {Object} props
 * @param {Object} props.league - Con `id` y `cards_enabled`.
 * @param {Object} props.round - La jornada elegida (`roundId`, `name`).
 */
export default function RoundDuel({ league, round }) {
    const { getAvatarSrc } = useTheme();
    const [data, setData] = useState(null);
    const [me, setMe] = useState(null);
    const [players, setPlayers] = useState([]);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [rivalId, setRivalId] = useState(null);
    const [kind, setKind] = useState('points');
    const [stake, setStake] = useState(1);

    const enabled = Boolean(league?.cards_enabled && league?.id && round?.roundId);

    const load = useCallback(async () => {
        if (!enabled) { setData(null); return; }
        try {
            const [d, user, parts] = await Promise.all([
                API.get(`/duels/league/${league.id}?round=${round.roundId}`),
                API.getUserByToken().catch(() => null),
                API.get(`/leagueParticipations/get/participants/${league.id}`).catch(() => []),
            ]);
            setData(d);
            setMe(user);
            setPlayers(parts.filter(p => p.User));
        } catch {
            setData(null);
        }
    }, [enabled, league?.id, round?.roundId]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        window.addEventListener(DUELS_EVENT, load);
        return () => window.removeEventListener(DUELS_EVENT, load);
    }, [load]);

    // A quién se puede retar, con el que tienes justo encima (o debajo) sugerido.
    const options = useMemo(() => {
        if (!me) return [];
        const mine = players.find(p => p.user_id === me.id);
        const idx = players.findIndex(p => p.user_id === me.id);
        const near = idx > 0 ? players[idx - 1] : players[idx + 1];
        return players
            .filter(p => p.user_id !== me.id)
            .map(p => {
                const busyOne = data?.busy?.includes(p.user_id);
                const diff = mine ? p.points - mine.points : null;
                const gap = diff === null ? '' : diff === 0 ? ' · empatado contigo' : ` · ${Math.abs(diff)} ${diff > 0 ? 'por encima' : 'por debajo'}`;
                return {
                    value: p.user_id,
                    disabled: busyOne,
                    label: `${p.User.username}${busyOne ? ' · ya tiene duelo' : gap}${near && near.user_id === p.user_id && !busyOne ? ' · sugerido' : ''}`,
                    suggested: near && near.user_id === p.user_id && !busyOne,
                };
            })
            .sort((a, b) => Number(b.suggested) - Number(a.suggested));
    }, [players, me, data]);

    if (!enabled || !data) return null;

    const act = async (fn, okText) => {
        setBusy(true);
        try {
            await fn();
            if (okText) showAlert('success', okText);
            refreshCoins({ quiet: true });
            await load();
            announceDuels();
        } catch (error) {
            showAlert('error', error?.response?.data?.error || 'No se pudo');
        } finally {
            setBusy(false);
        }
    };

    const openModal = () => {
        const s = options.find(o => o.suggested) || options.find(o => !o.disabled);
        setRivalId(s?.value ?? null);
        setKind('points');
        setStake(data.stakes.points[0]);
        setOpen(true);
    };

    const challenge = () => act(async () => {
        await API.post('/duels', { league_id: league.id, round_id: round.roundId, rival_id: rivalId, stake_kind: kind, stake });
        setOpen(false);
    }, 'Reto enviado. Le saldrá al entrar a la web.');

    const face = (u, size = 28) => <Avatar size={size} src={getAvatarSrc(u?.logo_url)} icon={<UserOutlined />} />;
    const cur = data.current;
    const incoming = data.incoming || [];

    // Nada que enseñar: ni duelo, ni retos, ni se puede retar (la jornada ya empezó).
    if (!cur && !incoming.length && !data.canChallenge) return null;

    return (
        <div className="round-duel">
            <div className="rd-head">
                <span className="rd-title"><Swords /> Duelo · {cur?.round ? roundName(cur.round) : round.name}</span>
                {cur && <span className={`rd-stake ${cur.stake_kind}`}>{cur.stake_kind === 'coins' && <CoinIcon size={12} />}{stakeText(cur)} en juego</span>}
            </div>

            {incoming.map(d => (
                <div key={d.id} className="rd-incoming">
                    {face(d.challenger)}
                    <span className="rd-incoming-text">
                        <b>{d.challenger?.username}</b> te reta en la {roundName(d.round)} · {stakeText(d)}
                    </span>
                    <span className="rd-actions">
                        <button type="button" className="rd-cta sm" disabled={busy} onClick={() => { duelSound({ slamOnly: true }); act(() => API.post(`/duels/${d.id}/respond`, { accept: true }), '¡Duelo aceptado!'); }}>
                            <span className="rd-cta-ico" aria-hidden="true"><Swords /></span>
                            <span>Aceptar</span>
                        </button>
                        <button type="button" className="rd-coward" disabled={busy} title="Rendirse sin pelear" onClick={() => act(() => API.post(`/duels/${d.id}/respond`, { accept: false }), 'Reto rechazado. Será otra vez…')}>
                            <WhiteFlag />
                            <span>Rechazar</span>
                        </button>
                    </span>
                </div>
            ))}

            {cur && cur.status === 'pending' && (
                <div className="rd-pending">
                    {cur.role === 'challenger' ? (
                        <>
                            <span>Has retado a <b>{cur.rival?.username}</b>: esperando respuesta. Si empieza la jornada sin contestar, caduca{cur.stake_kind === 'coins' ? ' y te devolvemos las pachanguitas' : ''}.</span>
                            <Popconfirm title="¿Retirar el reto?" okText="Retirar" cancelText="No" onConfirm={() => act(() => API.delete(`/duels/${cur.id}`), 'Reto retirado')}>
                                <Button size="small" disabled={busy}>Retirar</Button>
                            </Popconfirm>
                        </>
                    ) : null}
                </div>
            )}

            {cur && ['accepted', 'resolved'].includes(cur.status) && (() => {
                const mine = cur.role === 'challenger' ? cur.challenger : cur.rival;
                const his = cur.role === 'challenger' ? cur.rival : cur.challenger;
                const myPts = cur.score ? (cur.role === 'challenger' ? cur.score.challenger : cur.score.rival) : 0;
                const hisPts = cur.score ? (cur.role === 'challenger' ? cur.score.rival : cur.score.challenger) : 0;
                let status = 'Gana quien más puntos haga en la jornada.';
                let cls = '';
                if (cur.status === 'resolved') {
                    if (!cur.winner_id) { status = cur.stake_kind === 'coins' ? 'Empate: cada uno recupera lo suyo.' : 'Empate: nadie gana nada.'; }
                    else if (cur.winner_id === mine?.id) { status = `¡Has ganado! +${cur.stake_kind === 'coins' ? cur.stake * 2 : cur.stake} ${cur.stake_kind === 'coins' ? 'pachanguitas' : 'puntos'}`; cls = 'won'; }
                    else { status = `Has perdido: −${cur.stake} ${cur.stake_kind === 'coins' ? 'pachanguitas' : cur.stake === 1 ? 'punto' : 'puntos'}`; cls = 'lost'; }
                } else if (!cur.started) {
                    status = 'Empieza con el primer partido de la jornada.';
                }
                return (
                    <>
                        <div className="rd-score">
                            <span className="rd-side">{face(mine, 32)}<b>{mine?.username}</b></span>
                            <span className="rd-nums"><b>{myPts}</b><i>·</i><b>{hisPts}</b></span>
                            <span className="rd-side right"><b>{his?.username}</b>{face(his, 32)}</span>
                        </div>
                        <div className={`rd-status ${cls}`}>{status}</div>
                    </>
                );
            })()}

            {!cur && data.canChallenge && (
                <div className="rd-empty">
                    <span>Reta a alguien de la liga: quien haga más puntos en la jornada se lleva la apuesta.</span>
                    <button type="button" className="rd-cta" onClick={openModal} disabled={!options.some(o => !o.disabled)}>
                        <span className="rd-cta-ico" aria-hidden="true"><Swords /></span>
                        <span>Retar a alguien</span>
                    </button>
                </div>
            )}

            <Modal
                open={open}
                title="Retar a un duelo"
                okText="Retar"
                cancelText="Cancelar"
                onCancel={() => setOpen(false)}
                onOk={challenge}
                okButtonProps={{ disabled: !rivalId, loading: busy }}
                destroyOnHidden
            >
                <div className="rd-form">
                    <label>
                        <span>¿A quién?</span>
                        <Select value={rivalId} onChange={setRivalId} options={options} showSearch optionFilterProp="label" placeholder="Elige rival" />
                    </label>
                    <label>
                        <span>¿Qué os jugáis?</span>
                        <Segmented
                            block
                            value={kind}
                            onChange={(v) => { setKind(v); setStake(data.stakes[v][0]); }}
                            options={[{ value: 'points', label: 'Puntos de liga' }, { value: 'coins', label: 'Pachanguitas' }]}
                        />
                    </label>
                    <label>
                        <span>¿Cuánto?</span>
                        <Segmented block value={stake} onChange={setStake} options={data.stakes[kind].map(n => ({ value: n, label: String(n) }))} />
                    </label>
                    <Text type="secondary" style={{ fontSize: 12.5 }}>
                        {kind === 'points'
                            ? `Quien haga más puntos en la ${round.name} le quita ${stake} ${stake === 1 ? 'punto' : 'puntos'} al otro. Los puntos pasan de uno a otro: el total de la liga no cambia.`
                            : `Pones ${stake} pachanguitas ahora y tu rival otras ${stake} al aceptar. Quien haga más puntos en la ${round.name} se lleva las ${stake * 2}. Con empate, cada uno recupera las suyas.`}
                        {' '}Un duelo por jornada; si no contesta antes del primer partido, caduca.
                    </Text>
                </div>
            </Modal>
        </div>
    );
}
