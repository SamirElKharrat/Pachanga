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
/** Los vídeos, en WebM (VP9) y MP4 (H.264, para Safari): el navegador coge el primero que sepa. */
const videoUrl = (id, ext) => `${CLOUDINARY.replace('/image/', '/video/')}/q_auto/${id}.${ext}`;

/**
 * Las capturas de las novedades (cartas, duelos, tienda…), en Cloudinary como las demás.
 * Con `video` (también en Cloudinary), la diapositiva es un vídeo en bucle y la
 * captura, su cartel.
 */
export const NEW_SHOTS = [
    {
        id: 'cartas_ndfsmv',
        label: 'Cartas',
        path: '/predictions',
        text: 'Tu mano de cartas: Escudo, Gafe, Doble, Robo, Espejo, Chivato… y la carta del partido de cada día.',
    },
    {
        id: 'duelo_mmbrwo',
        // La entrada del aviso de verdad, en bucle (4 s, sin sonido). La foto hace de
        // cartel mientras carga y en los navegadores sin WebM.
        video: 'duelo_nyvhh7',
        label: 'Duelos',
        path: '/',
        text: 'Cuando alguien te reta, te enteras a pantalla completa. Aceptas como un valiente o rechazas con la bandera blanca.',
    },
    {
        id: 'inicio_yfox8n',
        label: 'Tu jornada',
        path: '/',
        text: 'En Inicio ves tus cartas de la jornada y tu duelo, y retas a quien tengas más cerca en la clasificación.',
    },
    {
        id: 'tienda_z1x4ph',
        label: 'Tienda',
        path: '/tienda',
        text: 'El escaparate cambia cada semana, con un artículo rebajado y títulos que solo se venden esa semana.',
    },
    {
        id: 'cofre_xs25sw',
        // Una apertura que sube hasta el dorado (Doble Dorada), en bucle.
        video: 'cofre_lig4cw',
        label: 'Cofres',
        path: '/tienda',
        text: 'Cofres de cada liga: la luz sube de color hasta el premio que te toca. Probabilidades a la vista y un raro asegurado cada 10.',
    },
    {
        id: 'perfil_oxzkab',
        label: 'Perfil',
        path: '/user',
        text: 'Tu perfil con banner animado, marco, color de nombre y título: todo lo que compras se ve en la web.',
    },
];

/** Las pantallas que enseña la portada, en el orden en que se recorren. */
const SHOTS = [
    {
        id: 'por-inicio_jadsrr',
        label: 'Inicio',
        path: '/',
        text: 'La jornada de un vistazo: próximos partidos, la clasificación de la liga y lo que ha puesto cada uno.',
    },
    {
        id: 'por-predicciones_sv2stq',
        label: 'Predicciones',
        path: '/predictions',
        text: 'Eliges ganador y marcador de cada partido, y aquí ves cuántos puntos te ha dado cada uno.',
    },
    {
        id: 'por-ligas_kdiu1r',
        label: 'Ligas',
        path: '/leagues',
        text: 'Todas las competiciones del año: LEC, First Stand, MSI y el Mundial.',
    },
    {
        id: 'por-liga_a6obbn',
        label: 'Liga',
        path: '/leagues',
        text: 'Cada liga con su clasificación y los equipos que juegan.',
    },
    {
        id: 'por-clasificacion_e0m7pr',
        label: 'Clasificación',
        path: '/clasificacion',
        text: 'La Pachanga del año: lo que suma cada uno en cada competición.',
    },
    {
        id: 'por-hof_bqcaf8',
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
export default function ScreenshotCarousel({ shots = SHOTS, label = 'Pantallas de la web' }) {
    const carousel = useRef(null);
    const [active, setActive] = useState(0);
    const shot = shots[active];

    // Los vídeos no se descargan hasta que se llega a su diapositiva (preload="none"):
    // al llegar, empieza desde el principio; los demás se paran.
    const frame = useRef(null);
    const restartVideo = () => {
        frame.current?.querySelectorAll('video').forEach(v => {
            if (v.closest('.slick-active') && !prefersReducedMotion()) {
                v.currentTime = 0;
                v.play().catch(() => {});
            } else if (!v.paused) {
                v.pause();
            }
        });
    };

    return (
        <div className="landing-shots">
            <div className="landing-shots-tabs" role="tablist" aria-label={label}>
                {shots.map((s, i) => (
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

            <div className="landing-shots-frame" ref={frame}>
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
                    afterChange={restartVideo}
                >
                    {shots.map((s, i) => (
                        <div key={s.id}>
                            {s.video ? (
                                <video
                                    poster={shotUrl(s.id, 1600)}
                                    muted
                                    loop
                                    playsInline
                                    preload="none"
                                    width={1600}
                                    height={820}
                                    aria-label={`Animación de la pantalla ${s.label} de la Pachanga`}
                                    className="landing-shots-img"
                                >
                                    <source src={videoUrl(s.video, 'webm')} type="video/webm" />
                                    <source src={videoUrl(s.video, 'mp4')} type="video/mp4" />
                                </video>
                            ) : (
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
                            )}
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
