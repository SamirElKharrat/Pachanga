import { useState, useEffect } from 'react';
import { API } from '../services/api';

/**
 * Calculates week intervals from a league start date to today.
 * Same algorithm as useHomeData – weeks start on Thursday.
 */
const calculateWeeks = (startDateStr, endDateStr) => {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const weeks = [];
    let currentWeekStart = new Date(startDate);
    const dayOfWeek = currentWeekStart.getDay();

    const daysToThursday =
        dayOfWeek === 4 ? 0 : dayOfWeek > 4 ? -(dayOfWeek - 4) : -(dayOfWeek + 3);
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
            end: currentWeekEnd.toISOString().split('T')[0],
        });

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        weekNumber++;
    }
    return weeks;
};

/**
 * Custom hook for the Prediction page.
 *
 * Phase 1 (runs on mount): loads leagues + user points for selected league.
 * Phase 2 (runs when league + week are set): loads match/prediction/result data.
 */
export const usePredictionData = (selectedLeague, selectedWeek) => {
    const [leagues, setLeagues]                                   = useState([]);
    const [weeks, setWeeks]                                       = useState([]);
    const [userPoints, setUserPoints]                             = useState(null);
    const [currentMatches, setCurrentMatches]                     = useState([]);
    const [hasPredicted, setHasPredicted]                         = useState(false);
    const [userCurrentPredictions, setUserCurrentPredictions]     = useState([]);
    const [historyMatches, setHistoryMatches]                     = useState([]);
    const [allResults, setAllResults]                             = useState([]);
    const [allUserPredictions, setAllUserPredictions]             = useState([]);
    const [loadingLeagues, setLoadingLeagues]                     = useState(true);
    const [loadingData, setLoadingData]                           = useState(false);
    const [error, setError]                                       = useState(null);

    // ── Phase 1: Load leagues (once on mount) ─────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        const fetchLeagues = async () => {
            setLoadingLeagues(true);
            try {
                const participations = await API.get('/leagueParticipations/get/');
                if (cancelled) return;

                const leagueArray = await Promise.all(
                    participations.map(p => API.get('/leagues/get/' + p.league_id))
                );
                if (cancelled) return;

                setLeagues(leagueArray.sort((a, b) => b.id - a.id));
            } catch (err) {
                console.error('[usePredictionData] leagues fetch failed:', err);
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoadingLeagues(false);
            }
        };

        fetchLeagues();
        return () => { cancelled = true; };
    }, []);

    // ── Phase 1b: Load user points whenever selected league changes ───────────
    useEffect(() => {
        if (!selectedLeague) return;
        let cancelled = false;

        const fetchPoints = async () => {
            try {
                const currentUser = await API.getUserByToken();
                if (cancelled) return;

                const participants = await API.get(
                    '/leagueParticipations/get/participants/' + selectedLeague
                );
                if (cancelled) return;

                const mine = participants.find(p => p.user_id === currentUser.id);
                if (!cancelled) setUserPoints(mine?.points ?? 0);
            } catch {
                if (!cancelled) setUserPoints(0);
            }
        };

        fetchPoints();
        return () => { cancelled = true; };
    }, [selectedLeague]);

    // ── Phase 2: Load week data (when both league + week are known) ───────────
    useEffect(() => {
        if (!selectedLeague || !selectedWeek) return;
        let cancelled = false;

        const fetchWeekData = async () => {
            setLoadingData(true);
            setError(null);

            try {
                const liga = leagues.find(l => l.id === selectedLeague);
                if (!liga) return;

                const allWeeks = calculateWeeks(liga.start_date, liga.end_date);
                if (!cancelled) setWeeks(allWeeks);

                const week = allWeeks.find(w => w.id === selectedWeek) ?? allWeeks[allWeeks.length - 1];
                if (!week) return;

                const [allUserPreds, allLeagueMatches, allRes] = await Promise.all([
                    API.get('/predictions/user').catch(() => []),
                    API.get('/matches/getByLeague/' + liga.id).catch(() => []),
                    API.get('/results/get').catch(() => []),
                ]);
                if (cancelled) return;

                const weekMatchesRaw = await API.get(
                    `/matches/getByWeek/${liga.id}/${week.start}T00:00:00/${week.end}T23:59:59`
                ).catch(() => []);
                if (cancelled) return;

                const weekMatches = weekMatchesRaw.sort(
                    (a, b) => new Date(a.date) - new Date(b.date)
                );

                const userWeekPreds = allUserPreds.filter(p =>
                    weekMatches.some(m => m.id === p.match_id)
                );
                const predictedIds = new Set(userWeekPreds.map(p => p.match_id));
                const didPredictAll =
                    weekMatches.length > 0 &&
                    weekMatches.every(m => predictedIds.has(m.id));

                const formMatches = didPredictAll
                    ? weekMatches
                    : weekMatches.filter(m => !predictedIds.has(m.id));

                const resultMatchIds = new Set(allRes.map(r => r.match_id));
                const withResults = allLeagueMatches
                    .filter(m => {
                        if (!resultMatchIds.has(m.id)) return false;
                        const mDate = (m.date || '').substring(0, 10);
                        return mDate >= week.start && mDate <= week.end;
                    })
                    .sort((a, b) => new Date(b.date) - new Date(a.date));

                setWeeks(allWeeks);
                setCurrentMatches(formMatches);
                setHasPredicted(didPredictAll);
                setUserCurrentPredictions(userWeekPreds);
                setHistoryMatches(withResults);
                setAllResults(allRes);
                setAllUserPredictions(allUserPreds);
            } catch (err) {
                console.error('[usePredictionData] week data fetch failed:', err);
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoadingData(false);
            }
        };

        fetchWeekData();
        return () => { cancelled = true; };
    }, [selectedLeague, selectedWeek, leagues]);

    return {
        leagues,
        weeks,
        userPoints,
        currentMatches,
        hasPredicted,
        userCurrentPredictions,
        historyMatches,
        allResults,
        allUserPredictions,
        loading: loadingLeagues || loadingData,
        error,
    };
};
