import { useState, useEffect, useCallback } from 'react';
import { API } from '../services/api';

/**
 * Custom hook to handle data fetching and week calculation for the Home page.
 *
 * `status` es la máquina de la carga: 'loading' → 'ready' | 'error'. Cada cambio de
 * liga o de semana (o `reload`) vuelve a 'loading'. Al fallar se conservan los datos
 * anteriores, así que «error con ligas» es una recarga fallida y «error sin ligas»,
 * que no hay nada que enseñar.
 *
 * Solo la última petición escribe. Sin eso, al saltar rápido de una semana a otra
 * (o de liga), la respuesta más lenta ganaba aunque fuera la de antes, y se veían
 * los partidos de una jornada con el selector en otra.
 *
 * @param {number|null} selectedLeague - ID of the selected league.
 * @param {number|null} selectedWeek - ID of the selected week.
 * @returns {object} Los datos, más `status`, `loading` (= status === 'loading') y `reload()`.
 */
export const useHomeData = (selectedLeague, selectedWeek) => {
    /** @type {['loading'|'ready'|'error', Function]} */
    const [status, setStatus] = useState('loading');
    const [nonce, setNonce] = useState(0);
    const [data, setData] = useState({
        leagues: [],
        participants: [],
        matches: [],
        predictions: [],
        results: [],
        favoriteTeams: [],
        weeks: [],
        questions: [],
        questionAnswers: [],
        currentUser: null,
        predictionsMade: false
    });

    useEffect(() => {
        let cancelled = false;

        const fetchAllData = async () => {
            try {
                setStatus('loading');

                // 1. Fetch Leagues
                const allLeaguesParticipants = await API.get('/leagueParticipations/get/');
                const leagueArray = await Promise.all(
                    allLeaguesParticipants.map(p => API.get('/leagues/get/' + p.league_id))
                );
                if (cancelled) return;
                const sortedLeagues = leagueArray.sort((a, b) => b.id - a.id);

                let leagueId = selectedLeague || (sortedLeagues.length > 0 ? sortedLeagues[0].id : null);
                
                if (!leagueId) {
                    setData(prev => ({ ...prev, leagues: sortedLeagues }));
                    setStatus('ready');
                    return;
                }

                const liga = sortedLeagues.find(l => l.id === leagueId);
                
                // 2. Week Calculation
                const weeks = calculateWeeks(liga.start_date, liga.end_date);
                
                // 3. Current User & Participants
                const currentUserInfo = await API.getUserByToken();
                // Pass selectedWeek so backend returns points for that week + movement indicators
                const weekParam = selectedWeek ? `?week=${selectedWeek}` : '';
                const participantsResponse = await API.get(`/leagueParticipations/get/participants/${leagueId}${weekParam}`);
                
                // Backend already returns them sorted by rank.
                // Bubble current user to top but keep the ranking data intact.
                const currentUserParticipant = participantsResponse.find(p => p.user_id === currentUserInfo.id);
                const otherParticipants = participantsResponse.filter(p => p.user_id !== currentUserInfo.id);
                const sortedParticipants = currentUserParticipant 
                    ? [currentUserParticipant, ...otherParticipants]
                    : participantsResponse;

                // 4. Favorite Teams
                const favoriteTeamsArray = await Promise.all(
                    sortedParticipants.map(p => API.get(`/favoriteTeams/get/${p.User.id}/${leagueId}`))
                );
                const formattedFavorites = favoriteTeamsArray.map(item => ({
                    user_id: item.favorite?.user_id || item.user_id,
                    team: item.team
                }));

                // 5. Matches & Predictions & Results (If week is available)
                let matches = [];
                let predictions = [];
                let results = [];
                let questions = [];
                let questionAnswers = [];
                let predictionsMade = false;

                const weekData = weeks.find(w => w.id === selectedWeek) || weeks[weeks.length - 1];

                if (weekData) {
                    // Fuera del `if (matches.length > 0)` de abajo a propósito: una
                    // jornada puede tener preguntas y no tener partidos.
                    [questions, questionAnswers] = await Promise.all([
                        API.get(`/questions/getByWeek/${leagueId}/${weekData.id}`).catch(() => []),
                        API.get(`/questions/answers/${leagueId}/${weekData.id}`).catch(() => []),
                    ]);

                    const matchesResponse = await API.get(`/matches/getByWeek/${leagueId}/${weekData.start}T00:00:00/${weekData.end}T23:59:59`);
                    matches = matchesResponse.sort((a, b) => new Date(a.date) - new Date(b.date));

                    if (matches.length > 0) {
                        const predictionsResponse = await Promise.all(
                            matches.map(m => API.get('/predictions/getByMatch/' + m.id))
                        );
                        predictions = predictionsResponse.flat();

                        const resultsResponse = await Promise.all(
                            matches.map(m => API.get('/results/getByMatch/' + m.id).catch(() => null))
                        );
                        results = resultsResponse.filter(Boolean);

                        predictionsMade = matches.every(match =>
                            predictions.some(p => p.match_id === match.id && p.User?.id === currentUserInfo.id)
                        );
                    }
                }

                if (cancelled) return;
                setData({
                    leagues: sortedLeagues,
                    participants: sortedParticipants,
                    matches,
                    predictions,
                    results,
                    favoriteTeams: formattedFavorites,
                    weeks,
                    questions,
                    questionAnswers,
                    currentUser: currentUserParticipant,
                    predictionsMade
                });
                setStatus('ready');

            } catch (err) {
                if (cancelled) return;
                console.error("Error fetching home data:", err);
                setStatus('error');
            }
        };

        fetchAllData();
        return () => { cancelled = true; };
    }, [selectedLeague, selectedWeek, nonce]);

    const reload = useCallback(() => setNonce(n => n + 1), []);

    return { ...data, status, loading: status === 'loading', reload };
};

/**
 * Helper to calculate weeks between two dates, starting from the first Thursday.
 */
const calculateWeeks = (startDateStr, endDateStr) => {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const weeks = [];
    let currentWeekStart = new Date(startDate);
    const dayOfWeek = currentWeekStart.getDay();

    // Adjust to previous Thursday (4) or current if it's Thursday
    let daysToThursday = (dayOfWeek === 4) ? 0 : (dayOfWeek > 4 ? -(dayOfWeek - 4) : -(dayOfWeek + 3));
    currentWeekStart.setDate(currentWeekStart.getDate() + daysToThursday);

    let weekNumber = 1;

    // Show ALL weeks in the league range (not just past weeks)
    while (currentWeekStart <= endDate) {
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

        weeks.push({
            id: weekNumber,
            name: `Semana ${weekNumber}`,
            start: currentWeekStart.toISOString().split('T')[0],
            end: currentWeekEnd.toISOString().split('T')[0]
        });

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        weekNumber++;
    }
    return weeks;
};
