import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider } from 'antd';
import { pachangaTheme, pachangaLightTheme, pachangaCrazyTheme } from '../styles/theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Read from localStorage or default to 'system'
    const [themePreference, setThemePreference] = useState(() => {
        return localStorage.getItem('pachanga_theme_preference') || 'system';
    });

    const [gifsEnabled, setGifsEnabled] = useState(() => {
        return localStorage.getItem('pachanga_gifs_enabled') !== 'false';
    });

    const [modoCrazy, setModoCrazy] = useState(() => {
        return localStorage.getItem('pachanga_crazy_mode') === 'true';
    });

    // The actual ant design theme that will be applied
    const [activeTheme, setActiveTheme] = useState(pachangaTheme);

    // Apply the active theme based on preference and system settings
    useEffect(() => {
        const updateTheme = () => {
            if (modoCrazy) {
                setActiveTheme(pachangaCrazyTheme);
                return;
            }

            if (themePreference === 'light') {
                setActiveTheme(pachangaLightTheme);
            } else if (themePreference === 'dark') {
                setActiveTheme(pachangaTheme);
            } else {
                // System preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setActiveTheme(prefersDark ? pachangaTheme : pachangaLightTheme);
            }
        };

        updateTheme();

        // If system, add listener for changes
        if (themePreference === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => updateTheme();
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [themePreference, modoCrazy]);

    // Handle Bizarre Mode body class
    useEffect(() => {
        if (modoCrazy) {
            document.body.classList.add('bizarre-mode');
        } else {
            document.body.classList.remove('bizarre-mode');
        }
    }, [modoCrazy]);

    const changeTheme = (newTheme) => {
        setThemePreference(newTheme);
        localStorage.setItem('pachanga_theme_preference', newTheme);
    };

    const toggleGifs = (enabled) => {
        setGifsEnabled(enabled);
        localStorage.setItem('pachanga_gifs_enabled', enabled);
    };

    const changeModoCrazy = (enabled) => {
        setModoCrazy(enabled);
        localStorage.setItem('pachanga_crazy_mode', enabled ? 'true' : 'false');
    };

    return (
        <ThemeContext.Provider value={{
            themePreference,
            changeTheme,
            isLightMode: activeTheme === pachangaLightTheme,
            gifsEnabled,
            toggleGifs,
            modoCrazy,
            changeModoCrazy
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
