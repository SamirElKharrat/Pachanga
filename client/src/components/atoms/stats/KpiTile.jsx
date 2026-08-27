import React from 'react';

/**
 * Una cifra grande con su etiqueta y un pie.
 *
 * Cuando un número es la respuesta, la respuesta es el número: no hay gráfica que
 * mejore un dato suelto.
 *
 * @param {Object} props
 * @param {string} props.label   - Etiqueta de arriba.
 * @param {string|number} props.value - La cifra.
 * @param {string} [props.unit]  - Sufijo pequeño pegado a la cifra ('%', 'pts'...).
 * @param {React.ReactNode} [props.foot] - Pie explicativo.
 * @param {number} [props.delta] - Diferencia contra una referencia; pinta signo y color.
 * @param {string} [props.deltaLabel] - Qué es esa referencia.
 * @param {boolean} [props.hero] - Destaca la primera de la fila.
 */
function KpiTile({ label, value, unit, foot, delta, deltaLabel, hero = false }) {
    const hasDelta = typeof delta === 'number' && !Number.isNaN(delta);

    return (
        <div className={`pstats-kpi${hero ? ' hero' : ''}`}>
            <span className="pstats-kpi-label">{label}</span>
            <div className="pstats-kpi-value" style={{ fontVariantNumeric: 'proportional-nums' }}>
                {value}
                {unit && <small>&thinsp;{unit}</small>}
            </div>
            {(foot || hasDelta) && (
                <div className="pstats-kpi-foot">
                    {hasDelta && (
                        <span className={`pstats-delta ${delta >= 0 ? 'up' : 'down'}`}>
                            {delta >= 0 ? '+' : '−'}{Math.abs(delta)}
                        </span>
                    )}
                    {hasDelta && deltaLabel ? <span>{deltaLabel}</span> : null}
                    {foot}
                </div>
            )}
        </div>
    );
}

export default KpiTile;
