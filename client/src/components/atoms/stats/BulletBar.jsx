import React from 'react';

/**
 * Una barra horizontal con una marca vertical de referencia.
 *
 * La marca es lo que hace que la barra sirva: convierte cada fila en un «por encima
 * o por debajo de la media» sin obligar a comparar unas con otras. Sin ella, ocho
 * barras entre el 59 % y el 72 % se parecen todas.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.label - Nombre de la fila (avatar + texto, o texto).
 * @param {number} props.value    - Valor a pintar.
 * @param {number} [props.max=1]  - Valor que llena la barra entera.
 * @param {number} [props.marker] - Dónde va la marca de referencia, en la misma escala.
 * @param {string} [props.display] - Texto de la derecha; si falta, se formatea el valor.
 * @param {string} [props.color]  - Color de la barra.
 * @param {string} [props.title]  - Tooltip nativo.
 * @param {string} [props.variant] - Modificador de la fila; 'con-puesto' ensancha la
 *   columna del valor para que quepa la chapita del puesto sin partirse en dos líneas.
 */
function BulletBar({ label, value, max = 1, marker, display, color, title, variant }) {
    const pct = (n) => `${Math.max(0, Math.min(100, (n / max) * 100))}%`;
    const hasMarker = typeof marker === 'number' && !Number.isNaN(marker);

    return (
        <div className={`pstats-bullet${variant ? ` ${variant}` : ''}`}>
            <div className="pstats-bullet-label">{label}</div>
            <div className="pstats-bullet-track" title={title}>
                <span
                    className="pstats-bullet-fill"
                    style={{ width: pct(value), background: color || undefined }}
                />
                {hasMarker && <span className="pstats-bullet-mark" style={{ left: pct(marker) }} />}
            </div>
            <div className="pstats-bullet-value">{display ?? value}</div>
        </div>
    );
}

export default BulletBar;
