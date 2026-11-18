import React from 'react';

/**
 * El cofre «Esports»: maletín negro y dorado con tiras de LED y un rombo central.
 * Dibujo propio en SVG. Los LED y el rombo toman `--gem` (el color de cada paso de
 * la apertura); en reposo, azul.
 *
 * Los degradados se definen una vez con <EsportsChestDefs /> (va en la apertura y en
 * la tienda); las piezas los usan por id.
 */

export function EsportsChestDefs() {
    return (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id="es-black" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#26262e" /><stop offset="1" stopColor="#0b0b0f" /></linearGradient>
                <linearGradient id="es-black2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a1a21" /><stop offset="1" stopColor="#060609" /></linearGradient>
                <linearGradient id="es-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b07f2e" /><stop offset=".45" stopColor="#f8e08e" /><stop offset="1" stopColor="#9a6b22" /></linearGradient>
            </defs>
        </svg>
    );
}

export function ChestLid() {
    return (
        <svg viewBox="0 0 150 56" aria-hidden="true" focusable="false">
            <path d="M4 55 V22 L22 4 H128 L146 22 V55 Z" fill="url(#es-black)" stroke="url(#es-gold)" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M22 4 L30 16 H120 L128 4" fill="none" stroke="url(#es-gold)" strokeWidth="1.4" opacity=".8" />
            <path d="M58 22 L75 34 L92 22" fill="none" stroke="url(#es-gold)" strokeWidth="3.5" strokeLinejoin="round" />
            <rect className="es-led" x="12" y="45" width="126" height="4" rx="2" />
        </svg>
    );
}

export function ChestBody() {
    return (
        <svg viewBox="0 0 150 78" aria-hidden="true" focusable="false">
            <path d="M4 2 H146 V69 L138 77 H12 L4 69 Z" fill="url(#es-black2)" stroke="url(#es-gold)" strokeWidth="2.5" strokeLinejoin="round" />
            <rect className="es-led" x="14" y="12" width="4" height="52" rx="2" />
            <rect className="es-led" x="132" y="12" width="4" height="52" rx="2" />
            <path d="M4 2 L18 2 L4 16 Z M146 2 L132 2 L146 16 Z M4 69 L4 56 L16 69 Z M146 69 L146 56 L134 69 Z" fill="url(#es-gold)" />
            <rect x="48" y="18" width="54" height="42" rx="5" fill="#0b0b0f" stroke="url(#es-gold)" strokeWidth="2" />
            <polygon className="es-gem" points="75,24 88,39 75,54 62,39" />
            <polygon points="75,27 82,35 75,39 68,35" fill="#fff" opacity=".45" />
            <path d="M30 30 H40 M30 38 H40 M30 46 H40 M110 30 H120 M110 38 H120 M110 46 H120" stroke="#3f3f4a" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

/** El cofre entero y quieto, para la tienda. */
export default function EsportsChest({ size = 1 }) {
    return (
        <div className="es-chest" style={{ '--s': size }} aria-hidden="true">
            <div className="es-chest-lid"><ChestLid /></div>
            <div className="es-chest-body"><ChestBody /></div>
        </div>
    );
}
