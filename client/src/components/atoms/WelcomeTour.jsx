import React, { useMemo } from 'react';
import { Tour } from 'antd';

/**
 * Los pasos del tour, en orden. Cada uno apunta a un elemento marcado con
 * `data-tour="<target>"` en la pantalla real; así el tour no se queda viejo cuando
 * cambia el diseño, solo hay que mantener la marca.
 */
const STEPS = [
    {
        target: 'next-games',
        title: 'Próximos partidos',
        description: 'Aquí salen los partidos que aún puedes predecir. Pulsa uno para ir a Predicciones y elige ganador y marcador. Puedes cambiarlo hasta que empiece.',
        placement: 'bottom',
    },
    {
        target: 'predictions-grid',
        title: 'Predicciones de la semana',
        description: 'Lo que ha puesto cada uno. Verde es pleno (ganador y marcador), ámbar solo el ganador y rojo fallo. Lo de los demás no se ve hasta que haces lo tuyo.',
        placement: 'left',
    },
    {
        target: 'league-ranking',
        title: 'Clasificación de la liga',
        description: 'Tus puntos en esta liga. Ojo a las rachas: 3, 5 y 6 plenos en la misma semana dan puntos extra.',
        placement: 'right',
    },
    {
        target: 'menu-predictions',
        title: 'Tus predicciones',
        description: 'Todas las que has hecho, por liga y semana. Aquí también eliges tu equipo favorito: un pleno con él vale +1.',
        placement: 'right',
    },
    {
        target: 'menu-standing',
        title: 'La Pachanga del año',
        description: 'Cada liga reparte puntos a la clasificación anual, y el campeón acaba en el Hall of Flame. Puedes repetir este tour desde tu menú de usuario.',
        placement: 'right',
    },
];

/**
 * Tour de bienvenida sobre el Inicio real.
 *
 * Los pasos se calculan al abrirlo y se quedan solo los que tienen su elemento en
 * pantalla: sin partidos esta semana no hay fila de Próximos Partidos, y en móvil el
 * menú está plegado en el cajón. Antes que señalar al vacío, el paso se salta.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose - Se llama al terminar o al cerrarlo.
 */
export default function WelcomeTour({ open, onClose }) {
    const steps = useMemo(() => {
        if (!open) return [];
        const visible = STEPS
            .map(step => ({ ...step, element: document.querySelector(`[data-tour="${step.target}"]`) }))
            .filter(step => step.element && step.element.getClientRects().length > 0);

        return visible.map((step, i) => ({
            title: step.title,
            description: step.description,
            placement: step.placement,
            target: () => step.element,
            prevButtonProps: { children: 'Anterior' },
            nextButtonProps: { children: i === visible.length - 1 ? 'Empezar a jugar' : 'Siguiente' },
        }));
    }, [open]);

    if (steps.length === 0) return null;

    return (
        <Tour
            open={open}
            onClose={onClose}
            onFinish={onClose}
            steps={steps}
            zIndex={1100}
        />
    );
}
