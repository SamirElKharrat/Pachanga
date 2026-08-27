import { useEffect, useState } from 'react';

/**
 * Si estamos en una pantalla de móvil.
 *
 * Hay cosas que el CSS no puede arreglar solo: el tamaño de los controles de Ant Design
 * es una prop, no una clase, y la proporción del viewBox de una gráfica se decide al
 * dibujarla. Para eso hace falta saberlo en JavaScript.
 *
 * Escucha el cambio en vez de leerlo una vez, así girar el móvil o abrir las
 * herramientas de desarrollo también reajusta.
 *
 * @param {number} [ancho] - Píxeles por debajo de los cuales se considera móvil.
 */
export default function useIsMobile(ancho = 700) {
    const consulta = `(max-width: ${ancho}px)`;
    const [esMovil, setEsMovil] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(consulta).matches
    );

    useEffect(() => {
        const mq = window.matchMedia(consulta);
        const alCambiar = (e) => setEsMovil(e.matches);
        setEsMovil(mq.matches);
        mq.addEventListener('change', alCambiar);
        return () => mq.removeEventListener('change', alCambiar);
    }, [consulta]);

    return esMovil;
}
