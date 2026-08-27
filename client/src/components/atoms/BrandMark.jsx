import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * La marca de la web, en un solo sitio.
 *
 * Durante el mundial es el escudo de Worlds; el resto del año, el logo de La
 * Pachanga de siempre. Antes esto estaba escrito a mano en tres archivos, con su
 * `filter: invert(1)` condicional repetido en cada uno.
 *
 * El escudo NO se sirve como imagen: es una silueta negra con transparencia, así
 * que se usa de máscara sobre un degradado de oro (`.worlds-crest`, en
 * styles/worlds.css). El mismo archivo vale para cualquier tamaño y color, y de
 * paso desaparece el `invert(1)`, que era un apaño para que el logo blanco se
 * viera sobre el tema claro.
 *
 * Los dos logos no tienen la misma forma —el de La Pachanga es apaisado, el
 * escudo es cuadrado—, así que cada uno lleva su medida. Pasar solo un `width`
 * dejaría el escudo enorme de alto.
 *
 * @param {Object} props
 * @param {number} props.logoWidth  - Ancho del logo de La Pachanga.
 * @param {number} props.crestSize  - Lado del escudo del mundial.
 * @param {boolean} [props.wordmark] - Añade «La Pachanga» bajo el escudo.
 * @param {Function} [props.onClick]
 * @param {Object} [props.style]
 */
export default function BrandMark({ logoWidth = 120, crestSize = 54, wordmark = false, onClick, style = {} }) {
    const { isWorlds, isLightMode } = useTheme();

    if (isWorlds) {
        const escudo = (
            <span
                className="worlds-crest"
                role="img"
                aria-label="Campeonato Mundial"
                onClick={wordmark ? undefined : onClick}
                style={{
                    width: crestSize,
                    height: crestSize,
                    display: 'block',
                    flexShrink: 0,
                    margin: '0 auto',
                    cursor: onClick ? 'pointer' : undefined,
                    ...style,
                }}
            />
        );
        if (!wordmark) return escudo;
        return (
            <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
                {escudo}
                <span className="worlds-wordmark">La Pachanga</span>
            </div>
        );
    }

    return (
        <img
            src="/pachanga_logo_blanco.webp"
            alt="La Pachanga"
            className="pachanga-logo-img"
            onClick={onClick}
            style={{
                width: logoWidth,
                height: 'auto',
                filter: isLightMode ? 'invert(1)' : 'none',
                cursor: onClick ? 'pointer' : undefined,
                ...style,
            }}
        />
    );
}
