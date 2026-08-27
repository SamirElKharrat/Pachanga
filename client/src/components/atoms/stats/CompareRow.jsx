import React from 'react';

/**
 * Una métrica de dos jugadores, enfrentada.
 *
 * Con valores tan pegados como suelen estar (68,5 frente a 67,1) la longitud de las
 * barras no dice nada, así que quien gana se marca con un triángulo y la barra del
 * otro se atenúa. Los números exactos van a los lados: son ellos los que llevan la
 * magnitud.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {number} props.a
 * @param {number} props.b
 * @param {string} props.colorA
 * @param {string} props.colorB
 * @param {Function} [props.format]
 * @param {boolean} [props.lowerIsBetter]
 */
function CompareRow({ label, a, b, colorA, colorB, format = (v) => v, lowerIsBetter = false }) {
    const top = Math.max(Math.abs(a), Math.abs(b)) || 1;
    const aWins = lowerIsBetter ? a < b : a > b;
    const bWins = lowerIsBetter ? b < a : b > a;

    return (
        <div className="pstats-cmprow">
            <span className="pstats-cmpnum">{format(a)}</span>
            <div className="pstats-cmptrack left">
                <i className={aWins ? 'win' : ''} style={{ width: `${(Math.abs(a) / top) * 100}%`, background: colorA }} />
            </div>
            <span className="pstats-cmplab">{label}</span>
            <div className="pstats-cmptrack">
                <i className={bWins ? 'win' : ''} style={{ width: `${(Math.abs(b) / top) * 100}%`, background: colorB }} />
            </div>
            <span className="pstats-cmpnum right">{format(b)}</span>
        </div>
    );
}

export default CompareRow;
