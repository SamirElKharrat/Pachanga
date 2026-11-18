import React from 'react';
import { Empty, Progress, Skeleton } from 'antd';
import { CoinIcon } from './CoinBalance';
import './css/coins.css';

const when = (date) => new Date(date).toLocaleString('es-ES', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

/**
 * Saldo e historial de pachanguitas. Solo pinta: los datos le llegan de fuera (el perfil
 * usa los suyos; el panel de admin, los del jugador elegido).
 *
 * @param {Object} props
 * @param {number|null} props.balance
 * @param {number} props.cap
 * @param {Array<Object>} props.movements - De GET /coins/me o /coins/user/:id.
 * @param {Array<{label: string, amount: number}>} [props.howToEarn]
 * @param {boolean} [props.loading]
 */
export default function CoinHistory({ balance, cap, movements, howToEarn = [], loading = false }) {
    if (loading && balance === null) return <Skeleton active paragraph={{ rows: 5 }} />;
    const full = balance >= cap;

    return (
        <div>
            <div className="coin-card-head">
                <CoinIcon size={34} />
                <div className="coin-card-big">
                    <b>{balance ?? 0}</b>
                    <span>{balance === 1 ? 'pachanguita' : 'pachanguitas'}</span>
                </div>
                <div className="coin-card-meter">
                    <Progress
                        percent={Math.round(((balance ?? 0) / cap) * 100)}
                        showInfo={false}
                        strokeColor="var(--medal-gold)"
                        size="small"
                    />
                    <small>
                        {full
                            ? `Has llegado al máximo de ${cap}: lo que ganes no se suma hasta que gastes`
                            : `Puedes tener hasta ${cap}. Valen en todas las ligas y no se cambian por puntos.`}
                    </small>
                </div>
            </div>

            {howToEarn.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(var(--tint),0.5)', marginBottom: 6 }}>
                        Cómo se ganan
                    </div>
                    <ul className="coin-rules">
                        {howToEarn.map(r => <li key={r.reason}>{r.label}: <b>+{r.amount}</b></li>)}
                    </ul>
                </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(var(--tint),0.5)', marginBottom: 2 }}>
                Movimientos
            </div>
            {movements.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aún no hay movimientos. Se ganan entrando a la web y enviando jornadas." />
            ) : (
                <div className="coin-list">
                    {movements.map(m => (
                        <div key={m.id} className={`coin-row${m.reversed ? ' reversed' : ''}`}>
                            <div className="coin-row-what">
                                <b>{m.label}</b>
                                {m.note && <small title={m.note}>{m.note}</small>}
                            </div>
                            <span
                                className={`coin-row-amount ${m.amount > 0 ? 'up' : m.amount < 0 ? 'down' : 'zero'}`}
                                title={m.amount === 0 ? 'Llegó con el máximo lleno' : undefined}
                            >
                                {m.amount > 0 ? '+' : m.amount < 0 ? '−' : ''}{Math.abs(m.amount)}
                            </span>
                            <span className="coin-row-when">{when(m.created_at)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
