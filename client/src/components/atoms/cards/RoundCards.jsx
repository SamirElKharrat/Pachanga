import React, { useEffect, useState } from 'react';
import { Avatar, Card, Space } from 'antd';
import { ThunderboltOutlined, UserOutlined } from '@ant-design/icons';
import { API } from '../../../services/api';
import { useTheme as useAppTheme } from '../../../context/ThemeContext';
import { effectText, matchName } from '../../../utils/cards';
import '../css/cards.css';

/** «Guille le echa el Gafe a Samir», «Samir juega la Doble»… */
function sentence(p) {
    const who = p.mine ? 'Juegas' : `${p.user?.username || 'Alguien'} juega`;
    if (p.key === 'gafe') return `${p.mine ? 'Le echas' : `${p.user?.username || 'Alguien'} le echa`} el Gafe a ${p.target?.username || '¿?'}`;
    return `${who} ${p.key === 'escudo' ? 'el Escudo' : p.key === 'chivato' ? 'el Chivato' : `la ${p.card.label}`}`;
}

/**
 * Las cartas jugadas en la jornada, en Inicio. De los demás solo salen las ya
 * reveladas (su partido ha empezado): lo decide el servidor. Si no hay ninguna, la
 * tarjeta no se pinta.
 *
 * @param {Object} props
 * @param {Object} props.league - Con `cards_enabled`.
 * @param {Object} props.round - La jornada elegida (`roundId`, `name`).
 * @param {Array<Object>} props.matches - Los partidos de la jornada, para nombrarlos.
 */
export default function RoundCards({ league, round, matches = [] }) {
    const [plays, setPlays] = useState([]);
    const { getAvatarSrc } = useAppTheme();

    useEffect(() => {
        if (!league?.cards_enabled || !round?.roundId) { setPlays([]); return; }
        let cancelled = false;
        API.get(`/cards/round/${round.roundId}`)
            .then(list => { if (!cancelled) setPlays(Array.isArray(list) ? list : []); })
            .catch(() => { if (!cancelled) setPlays([]); });
        return () => { cancelled = true; };
    }, [league?.cards_enabled, round?.roundId]);

    if (!league?.cards_enabled || plays.length === 0) return null;

    return (
        <Card
            className="cards-panel"
            title={
                <Space size={8}>
                    <ThunderboltOutlined style={{ color: 'var(--accent)' }} />
                    <span>Cartas de la {round.name}</span>
                </Space>
            }
            style={{ marginTop: 16 }}
        >
            <div className="plays">
                {plays.map(p => {
                    const e = effectText(p.effect);
                    const m = matches.find(x => x.id === p.match_id);
                    return (
                        <div key={p.id} className={`play-row rar-${p.card.rarity}`}>
                            <div className="play-row-what">
                                <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Avatar size={20} src={getAvatarSrc(p.user?.logo_url)} icon={<UserOutlined />} />
                                    {sentence(p)}
                                </b>
                                <small>
                                    {p.card.aim === 'round' ? 'Toda la jornada' : matchName(m)}
                                    {!p.revealed && ' · solo la ves tú hasta que empiece'}
                                </small>
                            </div>
                            <div className="play-row-side">
                                {p.key !== 'chivato' && <span className={`play-effect ${e.cls}`}>{e.text}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
