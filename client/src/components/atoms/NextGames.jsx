import { Skeleton, Typography, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { API } from '../../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { showAlert } from './AlertInfo';
import MatchCard from './MatchCard';

const { Text } = Typography;

/**
 * Component that displays a scrollable compact row of upcoming and live matches.
 * Automatically updates match statuses from 'scheduled' to 'live' if the time has passed.
 * Fully styled using Ant Design components and Design Tokens.
 * 
 * @returns {React.ReactElement|null} The NextGames horizontal list or null if no games.
 */
const NextGames = () => {
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(false);
    // Si ya se cargó una vez. El esqueleto solo se enseña la primera: en las siguientes
    // se deja lo que ya hay en pantalla mientras se refresca por detrás.
    const [yaCargado, setYaCargado] = useState(false);
    const [nextGames, setNextGames] = useState([]);
    const location = useLocation();
    const nav = useNavigate();

    // State to detect mobile devices responsively
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await API.get('/matches/getByWeek/');
                const gamesList = Array.isArray(response) ? response : [];
                const now = new Date();

                const updatedGames = await Promise.all(gamesList.map(async game => {
                    const matchDate = new Date(game.date);
                    if (matchDate <= now && game.status === 'scheduled') {
                        try {
                            await API.put('/matches/update/' + game.id, { status: 'live' });
                            return { ...game, status: 'live' };
                        } catch {
                            return game;
                        }
                    }
                    return game;
                }));

                const participationsRes = await API.get('/leagueParticipations/get/').catch(() => []);
                const participations = Array.isArray(participationsRes) ? participationsRes : [];
                const leagueIds = participations.map(p => p.league_id);

                const filtered = updatedGames
                    .filter(g => g.status !== 'finished' && leagueIds.includes(g.league_id))
                    .sort((a, b) => {
                        if (a.status === 'live' && b.status !== 'live') return -1;
                        if (a.status !== 'live' && b.status === 'live') return 1;
                        return new Date(a.date) - new Date(b.date);
                    });

                // Get only up to 6 games to prevent huge lists
                setNextGames(filtered.slice(0, 6));
            } catch (error) {
                console.error("Error fetching next games:", error);
            } finally {
                setLoading(false);
                setYaCargado(true);
            }
        };
        fetchData();
        // Por ruta, no por `location.key`. Con la clave, cualquier cambio en la URL
        // contaba como navegación —incluido pinchar una pestaña de Estadísticas, que
        // solo toca la query— y volvía a pedir los partidos. Los de esta semana no
        // cambian por eso.
    }, [location.pathname]);

    // El esqueleto solo la primera vez. Enseñándolo en cada refresco, el bloque pasaba
    // de 0 a 60 px y otra vez a su altura, y todo lo de debajo daba un salto: eso era
    // el aparecer y desaparecer al cambiar de pestaña.
    if (loading && !yaCargado) {
        return (
            <div style={{ padding: `0 ${token.paddingMD}px`, marginTop: token.marginMD, marginBottom: token.marginMD }}>
                <Skeleton.Button active block style={{ height: 60, borderRadius: token.borderRadiusLG }} />
            </div>
        );
    }
    if (nextGames.length === 0) return null;

    const renderMatchCard = (match, keyPrefix) => (
        <MatchCard
            key={`${keyPrefix}-${match.id}`}
            match={match}
            isMobile={isMobile}
            onClick={() => {
                if (match.status === 'live') {
                    window.open('https://www.twitch.tv/caedrel', '_blank');
                } else {
                    nav('/predictions/');
                }
            }}
        />
    );

    const isAnimated = nextGames.length > 4;
    const duration = Math.max(25, nextGames.length * 8);

    return (
        <div data-tour="next-games" style={{ padding: `0 ${token.paddingMD}px`, marginTop: token.marginMD, marginBottom: token.marginMD }}>
            <style>{`
                @keyframes nextGamesContinuousMarquee {
                    0% {
                        transform: translate3d(0, 0, 0);
                    }
                    100% {
                        transform: translate3d(-50%, 0, 0);
                    }
                }
                .next-games-marquee-wrapper {
                    overflow: hidden;
                    width: 100%;
                    mask-image: linear-gradient(to right, transparent, black 1.5%, black 98.5%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 1.5%, black 98.5%, transparent);
                }
                .next-games-marquee-track {
                    display: flex;
                    width: max-content;
                    animation: ${isAnimated ? `nextGamesContinuousMarquee ${duration}s linear infinite` : 'none'};
                    will-change: transform;
                }
                .next-games-marquee-wrapper:hover .next-games-marquee-track,
                .next-games-marquee-wrapper:active .next-games-marquee-track {
                    animation-play-state: paused;
                }
                .next-games-group {
                    display: flex;
                    gap: ${token.marginSM}px;
                    padding-right: ${token.marginSM}px;
                }
                .next-games-static-row {
                    display: flex;
                    gap: ${token.marginSM}px;
                    overflow-x: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .next-games-static-row::-webkit-scrollbar {
                    display: none;
                    width: 0;
                    height: 0;
                }
            `}</style>

            <Text strong style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: token.colorTextSecondary,
                letterSpacing: '0.08em',
                marginBottom: token.marginXS
            }}>
                Próximos Partidos
            </Text>

            {isAnimated ? (
                <div className="next-games-marquee-wrapper">
                    <div className="next-games-marquee-track">
                        <div className="next-games-group">
                            {nextGames.map((match) => renderMatchCard(match, 'g1'))}
                        </div>
                        <div className="next-games-group" aria-hidden="true">
                            {nextGames.map((match) => renderMatchCard(match, 'g2'))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="next-games-static-row">
                    {nextGames.map((match) => renderMatchCard(match, 'static'))}
                </div>
            )}
        </div>
    );
};

export default NextGames;
