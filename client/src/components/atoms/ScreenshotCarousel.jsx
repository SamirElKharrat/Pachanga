import React, { useRef, useState } from 'react';
import { Carousel, Typography } from 'antd';

const { Text } = Typography;

/**
 * Las capturas viven en Cloudinary, en la raíz de la cuenta. Cloudinary las sirve ya
 * reducidas y en el mejor formato que acepte el navegador (`f_auto`), así que se
 * suben tal cual salen de la pantalla. Para cambiar una, se sube la nueva y se
 * cambia aquí su id.
 */
const CLOUDINARY = 'https://res.cloudinary.com/dusai4gbp/image/upload';
const shotUrl = (id, width) => `${CLOUDINARY}/w_${width},f_auto,q_auto/${id}`;

/** Las pantallas que enseña la portada, en el orden en que se recorren. */
const SHOTS = [
    {
        id: 'inicio_c3uk8y',
        label: 'Inicio',
        path: '/',
        text: 'La jornada de un vistazo: próximos partidos, la clasificación de la liga y lo que ha puesto cada uno.',
    },
    {
        id: 'predicciones_sdfqkh',
        label: 'Predicciones',
        path: '/predictions',
        text: 'Eliges ganador y marcador de cada partido, y aquí ves cuántos puntos te ha dado cada uno.',
    },
    {
        id: 'ligas_mpgikq',
        label: 'Ligas',
        path: '/leagues',
        text: 'Todas las competiciones del año: LEC, First Stand, MSI y el Mundial.',
    },
    {
        id: 'liga_pkqdpr',
        label: 'Liga',
        path: '/leagues',
        text: 'Cada liga con su clasificación y los equipos que juegan.',
    },
    {
        id: 'clasificacion_lbcbia',
        label: 'Clasificación',
        path: '/clasificacion',
        text: 'La Pachanga del año: lo que suma cada uno en cada competición.',
    },
    {
        id: 'hall-of-flame_r5885j',
        label: 'Hall of Flame',
        path: '/hall-of-flame',
        text: 'Los campeones de siempre, con todos sus títulos.',
    },
];

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Carrusel de capturas de la web, dentro de un marco de navegador.
 *
 * Avanza solo cada pocos segundos y se para al pasar el ratón; con «reducir
 * movimiento» activado no avanza solo. Las pestañas de arriba llevan a cada
 * pantalla y marcan en cuál estás.
 */
export default function ScreenshotCarousel() {
    const carousel = useRef(null);
    const [active, setActive] = useState(0);
    const shot = SHOTS[active];

    return (
        <div className="landing-shots">
            <div className="landing-shots-tabs" role="tablist" aria-label="Pantallas de la web">
                {SHOTS.map((s, i) => (
                    <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={i === active}
                        className={i === active ? 'is-active' : undefined}
                        onClick={() => carousel.current?.goTo(i)}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <div className="landing-shots-frame">
                <div className="landing-shots-chrome" aria-hidden="true">
                    <span className="dots"><i /><i /><i /></span>
                    <span className="url">pachanga.lol{shot.path}</span>
                </div>
                <Carousel
                    ref={carousel}
                    autoplay={!prefersReducedMotion()}
                    autoplaySpeed={5000}
                    dots={false}
                    beforeChange={(_, next) => setActive(next)}
                >
                    {SHOTS.map((s, i) => (
                        <div key={s.id}>
                            <img
                                src={shotUrl(s.id, 1600)}
                                srcSet={`${shotUrl(s.id, 800)} 800w, ${shotUrl(s.id, 1600)} 1600w`}
                                sizes="(max-width: 768px) 100vw, 1100px"
                                alt={`Captura de la pantalla ${s.label} de la Pachanga`}
                                width={1600}
                                height={820}
                                loading={i === 0 ? 'eager' : 'lazy'}
                                className="landing-shots-img"
                            />
                        </div>
                    ))}
                </Carousel>
            </div>

            <Text type="secondary" className="landing-shots-caption" aria-live="polite">
                {shot.text}
            </Text>
        </div>
    );
}
