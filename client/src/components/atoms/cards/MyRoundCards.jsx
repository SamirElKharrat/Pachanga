import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { ThunderboltOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { API } from '../../../services/api';
import { CardEmblem } from './CardArt';
import { effectText, matchName } from '../../../utils/cards';
import '../css/cards.css';

/** «Gafe a Bruno · G2 vs KC», «Escudo · toda la jornada»… */
function detail(p, matches) {
    if (p.card.aim === 'round') return 'Toda la jornada';
    const m = matches.find(x => x.id === p.match_id);
    const where = m ? matchName(m) : 'un partido';
    return p.target ? `a ${p.target.username} · ${where}` : where;
}

/**
 * En Inicio, debajo de la liga: tus cartas de la jornada que estás mirando, en corto.
 * Qué has jugado (y a quién), cuántas te quedan y si tienes la gratis de esa jornada.
 * Para jugarlas, Predicciones.
 *
 * @param {Object} props
 * @param {Object} props.league - Con `id` y `cards_enabled`.
 * @param {Object} props.round - La jornada elegida (`roundId`, `name`).
 * @param {Array<Object>} props.matches - Los partidos de la jornada, para nombrarlos.
 */
export default function MyRoundCards({ league, round, matches = [] }) {
    const nav = useNavigate();
    const [hand, setHand] = useState(null);

    useEffect(() => {
        if (!league?.cards_enabled || !league?.id) { setHand(null); return undefined; }
        let cancelled = false;
        API.get(`/cards/hand/${league.id}`)
            .then(h => { if (!cancelled) setHand(h); })
            .catch(() => { if (!cancelled) setHand(null); });
        return () => { cancelled = true; };
    }, [league?.id, league?.cards_enabled, round?.roundId]);

    if (!league?.cards_enabled || !hand || !round?.roundId) return null;

    const plays = hand.plays.filter(p => p.round_id === round.roundId && p.status === 'active');
    const perRound = hand.effectsPerRound ?? 2;
    const left = Math.max(0, perRound - plays.filter(p => p.card.limited).length);
    const free = hand.hand.find(c => c.source === 'free' && c.round?.id === round.roundId);

    return (
        <div className="my-round-cards">
            <div className="mrc-head">
                <span className="mrc-title"><ThunderboltOutlined /> Tus cartas · {round.name}</span>
                <span className="mrc-left">{left === 0 ? `Ya has jugado tus ${perRound}` : `Te ${left === 1 ? 'queda 1' : `quedan ${left}`} por jugar`}</span>
            </div>
            <div className="mrc-body">
                {plays.length === 0 ? (
                    <span className="mrc-empty">Aún no has jugado ninguna carta esta jornada.</span>
                ) : plays.map(p => {
                    const e = effectText(p.effect);
                    return (
                        <div key={p.id} className={`mrc-play rar-${p.card.rarity}`}>
                            <CardEmblem cardKey={p.key} />
                            <div className="mrc-play-text">
                                <b>{p.card.label}</b>
                                <small>{detail(p, matches)}</small>
                            </div>
                            {p.key !== 'chivato' && <span className={`play-effect ${e.cls}`}>{e.text}</span>}
                        </div>
                    );
                })}
                {free && (
                    <span className="mrc-free">Tienes un <b>{free.label}</b> gratis para esta jornada: si no lo juegas, caduca.</span>
                )}
                <Button type="link" size="small" className="mrc-go" onClick={() => nav('/predictions')}>
                    {left > 0 ? 'Jugar cartas' : 'Ver en Predicciones'} <ArrowRightOutlined />
                </Button>
            </div>
        </div>
    );
}
