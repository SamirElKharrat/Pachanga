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
