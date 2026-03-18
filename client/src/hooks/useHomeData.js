import { useState, useEffect } from 'react';
import { API } from '../services/api';

/**
 * Custom hook to handle data fetching and week calculation for the Home page.
 * @param {number|null} selectedLeague - ID of the selected league.
 * @param {number|null} selectedWeek - ID of the selected week.
 */
export const useHomeData = (selectedLeague, selectedWeek) => {
    const [data, setData] = useState({
        leagues: [],
        participants: [],
        matches: [],
        predictions: [],
        results: [],
        favoriteTeams: [],
        weeks: [],
        currentUser: null,
        loading: true,
        predictionsMade: false
    });

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setData(prev => ({ ...prev, loading: true }));

                // 1. Fetch Leagues
                const allLeaguesParticipants = await API.get('/leagueParticipations/get/');
                const leagueArray = await Promise.all(
                    allLeaguesParticipants.map(p => API.get('/leagues/get/' + p.league_id))
                );
                const sortedLeagues = leagueArray.sort((a, b) => b.id - a.id);

                let leagueId = selectedLeague || (sortedLeagues.length > 0 ? sortedLeagues[0].id : null);
                
                if (!leagueId) {
                    setData(prev => ({ ...prev, leagues: sortedLeagues, loading: false }));
                    return;
                }

                const liga = sortedLeagues.find(l => l.id === leagueId);
                
                // 2. Week Calculation
                const weeks = calculateWeeks(liga.start_date, liga.end_date);
                
                // 3. Current User & Participants
                const currentUserInfo = await API.getUserByToken();
                const participantsResponse = await API.get('/leagueParticipations/get/participants/' + leagueId);
                
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
                let predictionsMade = false;

                const weekData = weeks.find(w => w.id === selectedWeek) || weeks[weeks.length - 1];
                
                if (weekData) {
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

                setData({
                    leagues: sortedLeagues,
                    participants: sortedParticipants,
                    matches,
                    predictions,
                    results,
                    favoriteTeams: formattedFavorites,
                    weeks,
                    currentUser: currentUserParticipant,
                    loading: false,
                    predictionsMade
                });

            } catch (err) {
                console.error("Error fetching home data:", err);
                setData(prev => ({ ...prev, loading: false }));
            }
        };

        fetchAllData();
    }, [selectedLeague, selectedWeek]);

    return data;
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
