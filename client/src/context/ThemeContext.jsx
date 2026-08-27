import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider } from 'antd';
import { pachangaTheme, pachangaLightTheme, pachangaWorldsTheme } from '../styles/theme';
import { resolveTheme } from '../styles/resolveTheme';
import { API } from '../services/api';

const ThemeContext = createContext();

// Claves de localStorage, en un sitio para que no se dupliquen por ahí sueltas.
const KEY_PREFERENCE   = 'pachanga_theme_preference';
const KEY_GIFS         = 'pachanga_gifs_enabled';
const KEY_WORLDS_CACHE = 'pachanga_worlds_season';
const KEY_WORLDS_OPTOUT = 'pachanga_worlds_optout';

/**
 * Última respuesta conocida del servidor sobre si estamos en el mundial.
 *
 * Se guarda para poder pintar bien en el PRIMER render. Sin esto, cada recarga
 * durante Worlds arranca con el tema normal y salta al del mundial medio segundo
 * después, cuando responde la API: un parpadeo azul→oro en cada visita.
 *
 * La primera visita de un navegador sí parpadea, porque no hay nada que cachear.
 * A partir de ahí, no.
 */
const readCachedSeason = () => {
    try {
        const raw = localStorage.getItem(KEY_WORLDS_CACHE);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;   // JSON corrupto: como si no hubiera cache
    }
};

export const ThemeProvider = ({ children }) => {
    // Read from localStorage or default to 'system'
    const [themePreference, setThemePreference] = useState(() => {
        return localStorage.getItem(KEY_PREFERENCE) || 'system';
    });

    const [gifsEnabled, setGifsEnabled] = useState(() => {
        return localStorage.getItem(KEY_GIFS) !== 'false';
    });

    // ── Temporada de Worlds ──────────────────────────────────────────────────
    // `worldsSeason` es lo que dice el servidor: null o { theme, league }.
    // `worldsOptOut` es lo que dice el usuario desde Opciones.
    const [worldsSeason, setWorldsSeason] = useState(readCachedSeason);
    const [worldsOptOut, setWorldsOptOut] = useState(() => {
        return localStorage.getItem(KEY_WORLDS_OPTOUT) === 'true';
    });

    // Al arrancar, preguntar al servidor. El endpoint es público a propósito:
    // el login también necesita saberlo y ahí todavía no hay sesión.
    useEffect(() => {
        let cancelado = false;

        API.get('/leagues/active-theme')
            .then(data => {
                if (cancelado) return;

                // Solo se hace caso a una respuesta que tenga la forma esperada.
                // Un proxy mal configurado o una página de error devuelven 200 con
                // HTML, y eso NO puede valer como «se acabó el mundial»: borraría
                // el cache y, peor, la preferencia de quien lo hubiera apagado.
                // Ante una respuesta rara, mejor quedarse como se estaba.
                if (!data || typeof data !== 'object' || typeof data.theme !== 'string') return;

                const activa = data.theme === 'worlds' ? data : null;
                setWorldsSeason(activa);

                if (activa) {
                    localStorage.setItem(KEY_WORLDS_CACHE, JSON.stringify(activa));
                } else {
                    // El mundial ha terminado. Se limpia también la preferencia de
                    // apagarlo, para que el año que viene nadie se quede fuera por
                    // un clic que dio hace doce meses.
                    localStorage.removeItem(KEY_WORLDS_CACHE);
                    localStorage.removeItem(KEY_WORLDS_OPTOUT);
                    setWorldsOptOut(false);
                }
            })
            .catch(() => {
                // Sin respuesta nos quedamos con lo cacheado. Que la piel no
                // dependa de que la API conteste.
            });

        return () => { cancelado = true; };
    }, []);

    // Lo que dice el sistema operativo. Solo se mira cuando la preferencia es 'system'.
    const [prefiereOscuro, setPrefiereOscuro] = useState(() =>
        window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    useEffect(() => {
        if (themePreference !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (e) => setPrefiereOscuro(e.matches);
        mq.addEventListener('change', onChange);
        setPrefiereOscuro(mq.matches);
        return () => mq.removeEventListener('change', onChange);
    }, [themePreference]);

    // La regla vive en styles/resolveTheme.js, que es una función pura y con test.
    const resolvedTheme = useMemo(() => resolveTheme({
        hayWorlds: !!worldsSeason,
        worldsOptOut,
        themePreference,
        prefiereOscuro,
    }), [worldsSeason, worldsOptOut, themePreference, prefiereOscuro]);

    const isWorlds = resolvedTheme === 'worlds';
    const isLightMode = resolvedTheme === 'light';

    const activeTheme = useMemo(() => {
        switch (resolvedTheme) {
            case 'worlds': return pachangaWorldsTheme;
            case 'light': return pachangaLightTheme;
            default: return pachangaTheme;
        }
    }, [resolvedTheme]);

    // El gancho del que colgará todo el CSS del modo Worlds. Solo se marca cuando
    // el mundial está activo; el resto del tiempo el atributo ni existe, de modo
    // que ninguna regla nueva puede afectar a la web normal.
    useEffect(() => {
        const root = document.documentElement;
        if (isWorlds) {
            root.setAttribute('data-theme', 'worlds');
        } else {
            root.removeAttribute('data-theme');
        }
    }, [isWorlds]);

    // Las fuentes del mundial se piden solo cuando hace falta. Cargarlas siempre
    // sería penalizar a todo el mundo once meses al año por un tema que dura uno.
    // No se retiran al apagar el modo: quitar el <link> no descarga nada y solo
    // provocaría volver a pedirlas si se vuelve a encender.
    useEffect(() => {
        if (!isWorlds) return;
        if (document.getElementById('worlds-fonts')) return;
        const link = document.createElement('link');
        link.id = 'worlds-fonts';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700'
                  + '&family=Barlow:wght@300;400;500;600;700'
                  + '&family=Barlow+Condensed:wght@500;600;700&display=swap';
        document.head.appendChild(link);
    }, [isWorlds]);

    // El título de la pestaña. El favicon NO se toca: el escudo es una silueta
    // negra sobre transparente y en una pestaña oscura sería invisible. Haría
    // falta una versión en oro del archivo, y eso es una imagen nueva, no código.
    useEffect(() => {
        document.title = isWorlds ? 'La Pachanga · Worlds' : 'La Pachanga';
    }, [isWorlds]);

    const changeTheme = (newTheme) => {
        setThemePreference(newTheme);
        localStorage.setItem(KEY_PREFERENCE, newTheme);
    };

    const toggleGifs = (enabled) => {
        setGifsEnabled(enabled);
        localStorage.setItem(KEY_GIFS, enabled);
    };

    /** Apagar o volver a encender el modo Worlds desde Opciones. */
    const changeModoWorlds = (enabled) => {
        setWorldsOptOut(!enabled);
        localStorage.setItem(KEY_WORLDS_OPTOUT, enabled ? 'false' : 'true');
    };

    return (
        <ThemeContext.Provider value={{
            themePreference,
            changeTheme,
            resolvedTheme,
            isLightMode,
            gifsEnabled,
            toggleGifs,
            // ── Worlds ──
            isWorlds,                                   // ¿se está viendo la piel del mundial?
            worldsSeason,                               // ¿hay mundial en curso, lo mire quien lo mire?
            worldsLeague: worldsSeason?.league ?? null, // nombre y escudo de la liga, para la marca
            changeModoWorlds,
        }}>
            <ConfigProvider theme={activeTheme}>
                {children}
            </ConfigProvider>
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    // Helper to conditionally block gif/mp4 avatars by changing their extension to .png
    // Both Cloudinary and Discord CDNs support serving the first frame of a GIF/MP4 by changing the extension
    const getAvatarSrc = (url) => {
        if (!url) return null;
        if (!context.gifsEnabled && (url.toLowerCase().includes('.gif') || url.toLowerCase().includes('.mp4'))) {
            return url.replace(/\.(gif|mp4)/i, '.png');
        }
        return url;
    };

    return { ...context, getAvatarSrc };
};
