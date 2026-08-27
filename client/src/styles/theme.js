import { theme } from 'antd';

export const pachangaTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#3b82f6',
    colorInfo: '#3b82f6',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorBgBase: '#0f172a',
    colorBgContainer: '#1e293b',
    colorBorder: '#334155',
    colorTextBase: '#f8fafc',
    borderRadius: 8,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  components: {
    Layout: {
      colorBgHeader: '#0f172a',
      colorBgBody: '#0f172a',
      colorBgSider: '#1e293b',
    },
    Card: {
      colorBgContainer: '#1e293b',
      colorBorderSecondary: '#334155',
    },
    Menu: {
      colorItemBgSelected: 'rgba(59, 130, 246, 0.15)',
      colorItemTextSelected: '#3b82f6',
    },
    Button: {
      borderRadius: 6,
      fontWeight: 600,
    },
    Input: {
      colorBgContainer: '#334155',
      colorBorder: 'transparent',
    },
    Select: {
      colorBgContainer: '#334155',
      colorBorder: 'transparent',
    },
    Modal: {
      contentBg: '#1e293b',
      headerBg: '#1e293b',
      footerBg: '#1e293b',
    },
  },
};

export const pachangaLightTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#3b82f6',
    colorInfo: '#3b82f6',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorBgBase: '#f8fafc',
    colorBgContainer: '#ffffff',
    colorBorder: '#e2e8f0',
    colorTextBase: '#0f172a',
    colorText: '#0f172a',
    colorTextSecondary: '#475569',
    borderRadius: 8,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  components: {
    Layout: {
      colorBgHeader: '#f8fafc',
      colorBgBody: '#f8fafc',
      colorBgSider: '#ffffff',
    },
    Card: {
      colorBgContainer: '#ffffff',
      colorBorderSecondary: '#e2e8f0',
    },
    Menu: {
      colorItemBgSelected: 'rgba(59, 130, 246, 0.15)',
      colorItemTextSelected: '#3b82f6',
      colorItemText: '#475569',
      colorItemTextHover: '#0f172a',
    },
    Button: {
      borderRadius: 6,
      fontWeight: 600,
    },
    Input: {
      colorBgContainer: '#ffffff',
      colorBorder: '#cbd5e1',
    },
    Select: {
      colorBgContainer: '#ffffff',
      colorBorder: '#cbd5e1',
    },
    Modal: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      footerBg: '#ffffff',
    },
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   MODO WORLDS — «Legacy»
   ═══════════════════════════════════════════════════════════════════════════

   El tema del mundial. Solo se aplica mientras hay Worlds en curso; el resto del
   año la web es exactamente la de siempre.

   No tiene variante clara a propósito: la identidad de Riot vive sobre negro y el
   oro no significa nada sobre blanco.

   Esto es la mitad del tema. La otra mitad son los tokens de `styles/worlds.css`,
   que es lo que Antd no alcanza: el CSS propio de Hall of Flame, Clasificación y
   Ligas. Los dos juegos tienen que decir lo mismo — si se toca un color aquí, hay
   que tocarlo allí.

   La forma NO cambia: el radio pasa de 8 a 10 y el del botón de 6 a 8, y ya. Un
   tema de temporada que además endurece las esquinas se siente como otra web, no
   como la misma en otra época.
   ═══════════════════════════════════════════════════════════════════════════ */
export const pachangaWorldsTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#C89B3C',      // Gold 3, paleta oficial del cliente de LoL
    colorInfo: '#C89B3C',
    colorSuccess: '#0AC8B9',      // teal hextech — el acierto
    colorWarning: '#C8AA6E',      // el ámbar por defecto pelea con el oro
    colorError: '#E05257',
    colorBgBase: '#08080B',
    colorBgContainer: '#101118',
    colorBorder: '#2B2721',       // filete cálido, no gris
    colorTextBase: '#E8E6E1',     // blanco roto, no blanco puro
    borderRadius: 10,
    fontFamily: "'Barlow', system-ui, -apple-system, sans-serif",
  },
  components: {
    // OJO con los nombres. En Antd 5 los tokens de Layout son `bodyBg`, `headerBg`
    // y `siderBg`. `colorBgSider` —que es lo que usan los otros temas de la casa—
    // NO existe: se ignora en silencio, y por eso la barra lateral se quedaba con
    // el azul marino por defecto de Antd en vez del color que se le pedía.
    Layout: {
      bodyBg: '#08080B',
      headerBg: '#08080B',
      siderBg: '#0B0C10',
    },
    Card: {
      colorBgContainer: '#101118',
      colorBorderSecondary: '#2B2721',
    },
    // El menú en modo oscuro tiene su propia paleta, con tokens `dark*` aparte.
    // Sin estos, el fondo del menú sigue siendo el azul de Antd por mucho que se
    // cambie el del Sider que lo contiene.
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkPopupBg: '#101118',
      darkItemColor: '#A9A498',
      darkItemHoverColor: '#F0E6D2',
      darkItemHoverBg: 'rgba(200, 155, 60, 0.07)',
      darkItemSelectedBg: 'rgba(200, 155, 60, 0.13)',
      darkItemSelectedColor: '#C8AA6E',
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(200, 155, 60, 0.13)',
      itemSelectedColor: '#C8AA6E',
    },
    Button: {
      borderRadius: 8,
      fontWeight: 600,
    },
    Input: {
      colorBgContainer: '#0C0D12',
      colorBorder: '#2B2721',
    },
    Select: {
      colorBgContainer: '#0C0D12',
      colorBorder: '#2B2721',
    },
    Modal: {
      contentBg: '#101118',
      headerBg: '#101118',
      footerBg: '#101118',
    },
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   COLORES DE GRÁFICA
   ═══════════════════════════════════════════════════════════════════════════

   Validados con el comprobador de daltonismo contra los dos fondos de la web
   (#1e293b y #ffffff): banda de luminosidad, suelo de croma, ΔE bajo protanopía,
   deuteranopía y tritanopía, y contraste ≥ 3:1. Todo en verde.

   Dos juegos distintos y no intercambiables:

   - `series` pinta MARCAS (barras, segmentos, celdas, líneas).
   - `text` escribe. Un #3b82f6 da 2,5:1 sobre blanco: vale para una barra, no
     para una etiqueta de 10 px.

   El color sigue a la persona, no a su posición: se asigna por id de usuario
   ordenado, así que filtrar o cambiar de ámbito no repinta a nadie. Como el
   criterio validado es el del par adyacente, toda gráfica lleva además leyenda
   y etiquetas directas, que es la codificación secundaria que eso exige.
   ═══════════════════════════════════════════════════════════════════════════ */
export const chartPalette = {
  series: ['#3b82f6', '#b8860b', '#8b5cf6', '#059669', '#f43f5e', '#0891b2'],

  /* ─── Juego para el modo Worlds ────────────────────────────────────────────
     Mantiene los mismos seis anclajes de tono y el mismo escalón de luminosidad
     que el juego de arriba, desplazados a la temperatura del mundial: el azul se
     aclara porque el fondo es más oscuro, el ocre pasa a ser el oro del tema y
     el verde pasa a ser el teal hextech.

     ⚠ ESTO NO ESTÁ VALIDADO TODAVÍA. El juego de arriba se comprobó con el
     comprobador de daltonismo contra #1e293b y #ffffff, y el fondo de Worlds
     (#08080B) no es ninguno de los dos. Hay que pasarlo antes de darlo por bueno.
     Mientras tanto sigue vigente lo de siempre: leyenda y etiqueta directa en
     toda gráfica, que es la codificación secundaria de la que depende todo esto. */
  worlds: ['#5b93e8', '#c89b3c', '#a78bfa', '#0ac8b9', '#f4677a', '#22b8d4'],

  text: {
    dark:   ['#93c5fd', '#fcd34d', '#c4b5fd', '#6ee7b7', '#fda4af', '#67e8f9'],
    light:  ['#1d4ed8', '#854d0e', '#6d28d9', '#047857', '#be123c', '#155e75'],
    worlds: ['#a9c8f5', '#e3c88a', '#cfc0fc', '#7fe8df', '#fbaab6', '#8fe0f0'],
  },
  // La media no es una categoría, es la referencia contra la que se lee el resto.
  reference: { mark: '#64748b', dark: '#cbd5e1', light: '#475569', worlds: '#a9a498' },
};

/**
 * El juego de marcas y de texto que le toca a un tema.
 *
 * Se pasa el nombre del tema, no un booleano: con cuatro temas, un `isLight`
 * ya no puede decir la verdad. Cualquier nombre que no conozca cae en el juego
 * oscuro, que es el que sirve para el modo loco y para lo que venga.
 *
 * @param {'dark'|'light'|'worlds'|string} [variant]
 * @returns {{series: string[], text: string[], reference: string}}
 */
export const paletteFor = (variant = 'dark') => ({
  series: variant === 'worlds' ? chartPalette.worlds : chartPalette.series,
  text: chartPalette.text[variant] ?? chartPalette.text.dark,
  reference: chartPalette.reference[variant] ?? chartPalette.reference.dark,
});

/**
 * Color preferido de una persona. Se ordena por id, así que dar de alta a alguien
 * nuevo no cambia el color de nadie.
 *
 * OJO: la paleta tiene 6 huecos y puede haber más jugadores. Esto NO garantiza que
 * dos personas tengan colores distintos — para eso está `distinctColorsFor`, que es
 * lo que hay que usar siempre que se pinten varias a la vez. Ampliar la paleta no es
 * la solución: pasando de ocho tonos hay pares que un daltónico ya no separa.
 *
 * @param {number} userId
 * @param {Array<number>} allUserIds - Todos los del ámbito.
 * @param {'dark'|'light'|'worlds'} [variant]
 * @returns {{mark: string, text: string, index: number}}
 */
export const colorForUser = (userId, allUserIds = [], variant = 'dark') => {
  const { series, text } = paletteFor(variant);
  const order = [...new Set(allUserIds)].sort((a, b) => a - b);
  const found = order.indexOf(userId);
  const i = (found < 0 ? 0 : found) % series.length;
  return { index: i, mark: series[i], text: text[i] };
};

/**
 * Colores para un grupo que se pinta a la vez, garantizando que ninguno se repite.
 *
 * Cada uno se queda con su color preferido mientras esté libre; si ya lo ha cogido
 * otro —pasa en cuanto hay más de seis jugadores y los índices dan la vuelta— coge el
 * primer hueco disponible. Así el color sigue siendo estable en el caso normal y
 * nunca hay dos líneas del mismo tono, que es lo que hacía indistinguibles a Samir y
 * a Fabri.
 *
 * @param {Array<number>} userIds - En el orden en que se van a pintar.
 * @param {Array<number>} allUserIds - Todos los del ámbito.
 * @param {'dark'|'light'|'worlds'} [variant]
 * @returns {Object} userId -> {mark, text, index}
 */
export const distinctColorsFor = (userIds, allUserIds = [], variant = 'dark') => {
  const { series, text: texts } = paletteFor(variant);
  const taken = new Set();
  const out = {};

  for (const id of userIds) {
    let i = colorForUser(id, allUserIds, variant).index;
    if (taken.has(i)) {
      const free = series.findIndex((_, k) => !taken.has(k));
      i = free === -1 ? i : free;   // con más de 6 a la vez ya no hay nada que hacer
    }
    taken.add(i);
    out[id] = { index: i, mark: series[i], text: texts[i] };
  }

  return out;
};
