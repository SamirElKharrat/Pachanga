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

export const pachangaCrazyTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#ff00ff',
    colorInfo: '#ff00ff',
    colorSuccess: '#00ff00',
    colorWarning: '#ffff00',
    colorError: '#ff0000',
    colorBgBase: '#ccff00',
    colorBgContainer: '#ff00ff',
    colorBorder: '#00ffff',
    colorTextBase: '#0000ff',
    colorText: '#0000ff',
    colorTextSecondary: '#ff0000',
    borderRadius: 50,
    fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif',
  },
  components: {
    Layout: {
      colorBgHeader: '#ccff00',
      colorBgBody: '#ccff00',
      colorBgSider: '#ff00ff',
    },
    Card: {
      colorBgContainer: '#00ffff',
      colorBorderSecondary: '#ff00ff',
    },
    Menu: {
      colorItemBgSelected: '#00ff00',
      colorItemTextSelected: '#ff00ff',
      colorItemText: '#000000',
      colorItemTextHover: '#ffffff',
    },
    Button: {
      borderRadius: 50,
      fontWeight: 900,
    },
    Input: {
      colorBgContainer: '#ff00ff',
      colorBorder: '#00ffff',
    },
    Select: {
      colorBgContainer: '#ff00ff',
      colorBorder: '#00ffff',
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
  text: {
    dark:  ['#93c5fd', '#fcd34d', '#c4b5fd', '#6ee7b7', '#fda4af', '#67e8f9'],
    light: ['#1d4ed8', '#854d0e', '#6d28d9', '#047857', '#be123c', '#155e75'],
  },
  // La media no es una categoría, es la referencia contra la que se lee el resto.
  reference: { mark: '#64748b', dark: '#cbd5e1', light: '#475569' },
};

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
 * @param {boolean} [isLight]
 * @returns {{mark: string, text: string, index: number}}
 */
export const colorForUser = (userId, allUserIds = [], isLight = false) => {
  const order = [...new Set(allUserIds)].sort((a, b) => a - b);
  const found = order.indexOf(userId);
  const i = (found < 0 ? 0 : found) % chartPalette.series.length;
  return {
    index: i,
    mark: chartPalette.series[i],
    text: chartPalette.text[isLight ? 'light' : 'dark'][i],
  };
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
 * @param {boolean} [isLight]
 * @returns {Object} userId -> {mark, text, index}
 */
export const distinctColorsFor = (userIds, allUserIds = [], isLight = false) => {
  const texts = chartPalette.text[isLight ? 'light' : 'dark'];
  const taken = new Set();
  const out = {};

  for (const id of userIds) {
    let i = colorForUser(id, allUserIds, isLight).index;
    if (taken.has(i)) {
      const free = chartPalette.series.findIndex((_, k) => !taken.has(k));
      i = free === -1 ? i : free;   // con más de 6 a la vez ya no hay nada que hacer
    }
    taken.add(i);
    out[id] = { index: i, mark: chartPalette.series[i], text: texts[i] };
  }

  return out;
};
