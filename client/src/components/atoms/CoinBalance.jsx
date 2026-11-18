import React from 'react';
import { Tooltip } from 'antd';
import useCoins from '../../hooks/useCoins';
import './css/coins.css';

/** La moneda dibujada. Decorativa: el número va siempre al lado. */
export const CoinIcon = ({ size = 16 }) => (
    <span className="coin-icon" style={{ width: size, height: size }} aria-hidden="true" />
);

/**
 * El saldo de pachanguitas, en una píldora. Pinchando, lleva al historial del perfil.
 *
 * @param {Object} props
 * @param {boolean} [props.compact] - Solo el número (menú plegado, cabecera del móvil).
 * @param {Function} [props.onClick]
 */
export default function CoinBalance({ compact = false, onClick }) {
    const { status, balance, cap } = useCoins();
    if (status === 'error' || (status !== 'ready' && balance === null)) return null;

    const full = balance >= cap;
    const label = `${balance} ${balance === 1 ? 'pachanguita' : 'pachanguitas'}${full ? ' (techo lleno)' : ''}`;
    return (
        <Tooltip title={compact ? label : (full ? `Has llegado al máximo de ${cap}: lo que ganes no se suma hasta que gastes` : `Máximo ${cap}`)}>
            <button
                type="button"
                className={`coin-balance${compact ? ' compact' : ''}${full ? ' full' : ''}`}
                onClick={onClick}
                aria-label={`${label}. Ver historial`}
            >
                <CoinIcon size={compact ? 14 : 16} />
                <span className="coin-balance-num">{balance}</span>
                {!compact && <span className="coin-balance-unit">{balance === 1 ? 'pachanguita' : 'pachanguitas'}</span>}
            </button>
        </Tooltip>
    );
}
