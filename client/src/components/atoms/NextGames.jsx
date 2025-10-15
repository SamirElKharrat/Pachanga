import { Carousel, Image, Skeleton, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { API } from '../../services/api'
import { useLocation, useNavigate } from 'react-router-dom'
import { showAlert } from './AlertInfo';
import { Tooltip } from 'antd';

const { Text } = Typography;

const status = {
    scheduled: <span className='badge rounded-pill bg-info'>Programado</span>,
    live: <span className='badge rounded-pill bg-danger'>En vivo</span>,
    finished: <span className='badge rounded-pill bg-success'>Finalizado</span>
}

// Función para agrupar partidos en grupos de 3
const groupMatches = (matches) => {
    const isMobile = window.innerWidth <= 768;
    const chunkSize = isMobile ? 1 : 6;
    const result = [];
    for (let i = 0; i < matches.length; i += chunkSize) {
        result.push(matches.slice(i, i + chunkSize));
    }
    return result;
};

const NextGames = () => {
    const [loading, setLoading] = useState(false);
    const [nextGames, setNextGames] = useState([]);
    const location = useLocation();
    const nav = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await API.get('/matches/getByWeek/');
                const filterDate = response.map(match => ({
                    ...match,
                    rawDate: new Date(match.date), // Para ordenar
                    formattedDate: new Intl.DateTimeFormat('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }).format(new Date(match.date))
                }));
                //All user participations in leagues
                const responseLeagueParticipation = await API.get('/leagueParticipations/get/').then(response => response.map(participation => participation.league_id))

                //Filter matches by user participations
                const filterResponse = filterDate.filter(match => responseLeagueParticipation.includes(match.league_id))
                setNextGames(filterResponse)

            } catch (error) {
                console.error(error);
                showAlert('error', "Error al cargar los partidos");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [location.key]);

    useEffect(() => {
        const checkLiveMatches = async () => {
            const now = new Date();

            setNextGames(prevGames =>
                prevGames.map(game => {
                    const matchDate = new Date(game.date);
                    // If match time has come and status is still 'scheduled' or similar
                    if (matchDate <= now && game.status === 'scheduled') {
                        // Update status in the backend
                        API.put('/matches/update/' + game.id, { status: 'live' });
                        // Optimistically update UI
                        return { ...game, status: 'live' };
                    }
                    return game;
                })
            );
        };

        // Check immediately
        checkLiveMatches();

        // Then check every 30 seconds (more efficient than every minute)
        const interval = setInterval(checkLiveMatches, 30000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <Skeleton className='container mt-5' />;
    }

    if (nextGames.length === 0) {
        return (
            <div style={{
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                margin: '1rem 0'
            }}>
                <Text style={{ fontSize: '1.2rem', margin: 0 }}>
                    No hay partidos disponibles esta semana
                </Text>
            </div>
        );
    }

    return (
        <Carousel
            style={{ padding: '20px' }}
            dots={false}
            arrows={true}
            slidesToShow={1}
            slidesToScroll={1}
        >
            {groupMatches([...nextGames].sort((a, b) => {
                // Primero ordenar por estado (scheduled primero)
                if (a.status === 'scheduled' && b.status !== 'scheduled') return -1;
                if (a.status !== 'scheduled' && b.status === 'scheduled') return 1;

                // Luego por fecha y hora (más cercano primero)
                return new Date(a.rawDate) - new Date(b.rawDate);
            })).map((group, i) => (
                <div key={i} className='d-flex justify-content-around align-items-center'>
                    {group.map((match) => (
                        <div
                            key={match.id}
                            className="d-flex flex-column align-items-center"
                            style={{ minWidth: '160px', userSelect: 'none' }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <Image preview={false} height={45} width={45} src={match.Teams[0]?.logo_url} />
                                <span className="text-light fw-bold fs-5 user-select-none">vs</span>
                                <Image preview={false} height={45} width={45} src={match.Teams[1]?.logo_url} />
                            </div>

                            <div className="d-flex flex-column align-items-center text-center mt-3 gap-2">
                                <span className="badge rounded-pill fw-semibold fs-6 user-select-none px-3 py-1">
                                    {match.formattedDate}
                                </span>
                                {match.status === 'scheduled' ? (
                                    <Text onClick={() => nav('/predictions/')}>{status[match.status]}</Text>
                                ) : (
                                    status[match.status]
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </Carousel>
    )
}

export default NextGames    
