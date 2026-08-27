import React from 'react';

/**
 * Una barra apilada con el origen de los puntos de alguien.
 *
 * Se normaliza al 100 % de cada jugador y el total va aparte, a la derecha: la
 * pregunta aquí es en qué proporción puntúa cada uno, no cuánto, que eso ya lo
 * responde la tabla.
 *
 * Los segmentos se separan con 2 px de hueco en vez de con un borde, que engorda las
 * marcas pequeñas hasta hacerlas mentir.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.label
 * @param {Array<{key: string, value: number, color: string, name: string}>} props.parts
 * @param {number|string} props.total - Lo que se enseña a la derecha.
 */
function StackedPointsBar({ label, parts, total }) {
    const sum = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
    if (sum <= 0) return null;

    return (
        <div className="pstats-stackrow">
            <div className="pstats-bullet-label">{label}</div>
            <div className="pstats-stack">
                {parts.filter(p => p.value > 0).map(p => (
                    <i
                        key={p.key}
                        style={{ width: `${(p.value / sum) * 100}%`, background: p.color }}
                        title={`${p.name}: ${p.value} pts`}
                    />
                ))}
            </div>
            <div className="pstats-bullet-value">{total}</div>
        </div>
    );
}

export default StackedPointsBar;
