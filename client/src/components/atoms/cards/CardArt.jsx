import React from 'react';

const svg = (children) => (
    <svg className="card-ico" viewBox="0 0 24 24" aria-hidden="true">{children}</svg>
);

const ICONS = {
    escudo: svg(<><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>),
    gafe: svg(<path d="M13 2L4 14h7l-1 8 9-12h-7z" />),
    dorada: svg(<><path d="M4 8l4 4 4-7 4 7 4-4-2 10H6z" /><path d="M6 21h12" /></>),
    // Robo: una mano que se lleva una moneda.
    robo: svg(<><path d="M4 14l4-4 4 3 6-6" /><path d="M14 7h4v4" /><circle cx="7" cy="18" r="2.5" /></>),
    // Espejo: el castigo que llega y vuelve.
    espejo: svg(<><rect x="8" y="3" width="8" height="18" rx="4" /><path d="M3 9h4M5 7l2 2-2 2" /><path d="M21 15h-4M19 13l-2 2 2 2" /></>),
    chivato: svg(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
};

/** El emblema del centro de la carta. La Doble lleva «×2» en vez de un dibujo. */
export function CardEmblem({ cardKey }) {
    return (
        <span className="card-emb" aria-hidden="true">
            {ICONS[cardKey] || <span className="card-x2">×2</span>}
        </span>
    );
}
