const { Op } = require('sequelize');
const FavoriteTeam = require('../models/favoriteTeam');
const Match = require('../models/match');
const Result = require('../models/result');
const Prediction = require('../models/prediction');
const { startOfWeek, endOfWeek } = require('../controllers/weekController');

/**
 * Calculates the points earned by a user for a specific match prediction, split by
 * where each point comes from.
 *
 * This is the single source of truth for scoring. `calculatePredictionPoints` is a
 * thin wrapper over it, and the stats aggregator uses the breakdown directly so the
 * two can never drift apart.
 *
 * @param {Object} params
 * @param {Object} params.prediction - The user's prediction object.
 * @param {Object} params.match - The match object being resolved.
 * @param {number} params.winner - The ID of the winning team for the match.
 * @param {string} params.resultStr - The exact result string (e.g., '2-0', '3-1').
 * @param {Array<number>} [params.weekMatchIds] - Optional pre-fetched array of match IDs for the week in chronological order.
 * @param {Object} [params.resultMap] - Optional pre-fetched map of matchId -> { winner, result } for the week's results.
 * @param {Array<Object>} [params.allWeekPredictions] - Optional pre-fetched array of all predictions for the week.
 * @param {Object} [params.favoriteTeamMap] - Optional pre-fetched map of userId -> favourite teamId for this league.
 *   Pass it to skip one FavoriteTeam query per prediction.
 * @returns {Promise<{total: number, base: number, exact: number, streak: number, favorite: number, streakLength: number, isPerfect: boolean}>}
 */
exports.calculatePredictionBreakdown = async ({
    prediction,
    match,
    winner,
    resultStr,
    weekMatchIds = null,
    resultMap = null,
    allWeekPredictions = null,
    favoriteTeamMap = null
}) => {
    const breakdown = { total: 0, base: 0, exact: 0, streak: 0, favorite: 0, streakLength: 0, isPerfect: false };

    // Check if the user predicted the correct winner
    if (prediction.winner !== winner) {
        return breakdown; // 0 points if winner is wrong
    }

    // Base points for correct winner
    breakdown.base = 2;

    const isPerfect = (resultStr === prediction.description);
    breakdown.isPerfect = isPerfect;

    // 1. Favorite Team Bonus (STRICT: Only if perfect hit)
    if (isPerfect) {
        let favoriteTeamId;

        if (favoriteTeamMap) {
            // Pre-fetched by the caller: no query at all
            favoriteTeamId = favoriteTeamMap[prediction.user_id];
        } else {
            const favoriteTeam = await FavoriteTeam.findOne({
                where: {
                    user_id: prediction.user_id,
                    league_id: match.league_id,
                    team_id: prediction.winner
                }
            });
            favoriteTeamId = favoriteTeam ? favoriteTeam.team_id : null;
        }

        if (favoriteTeamId === prediction.winner) {
            breakdown.favorite = 1;
        }
    }

    // 2. Exact Score Bonus (BO3 or BO5)
    if (isPerfect) {
        switch (match.format) {
            case 'BO3':
                breakdown.exact = 3;
                break;
            case 'BO5':
                breakdown.exact = 5;
                break;
        }
    }

    // 3. Pleno Bonus
    //
    // A pleno is the run of perfect hits — winner AND exact score — that a week opens
    // with. Two rules make it strict:
    //
    //   - Getting the winner right but missing the score breaks it.
    //   - Once broken, the week is over for plenos. You cannot start another one.
    //
    // Not predicting a match counts as missing it, so skipping one ends the run too.

    // If cache objects aren't provided (e.g., single calculation), fetch them
    if (!weekMatchIds || !resultMap || !allWeekPredictions) {
        const weekStart = startOfWeek(match.date);
        const weekEnd = endOfWeek(match.date);

        const weekMatches = await Match.findAll({
            where: {
                league_id: match.league_id,
                date: {
                    [Op.between]: [weekStart, weekEnd]
                }
            },
            order: [['date', 'ASC']]
        });
        weekMatchIds = weekMatches.map(m => m.id);

        const currentMatchIndex = weekMatchIds.indexOf(match.id);
        const relevantMatchIds = weekMatchIds.slice(0, currentMatchIndex + 1);

        const resultsThisWeek = await Result.findAll({
            where: {
                match_id: { [Op.in]: relevantMatchIds }
            }
        });
        resultMap = {};
        resultsThisWeek.forEach(r => {
            resultMap[r.match_id] = { winner: r.winner, result: r.result };
        });
        // Ensure current is in map explicitly
        resultMap[match.id] = { winner, result: resultStr };

        allWeekPredictions = await Prediction.findAll({
            where: {
                user_id: prediction.user_id,
                match_id: { [Op.in]: relevantMatchIds }
            }
        });
    }

    const currentMatchIndex = weekMatchIds.indexOf(match.id);
    const userWeekPreds = allWeekPredictions.filter(p => p.user_id === prediction.user_id);

    let currentStreak = 0;
    let broken = false;

    // Walk the week from the start: the pleno is the opening run, nothing else.
    for (let i = 0; i <= currentMatchIndex; i++) {
        const mId = weekMatchIds[i];
        const real = resultMap[mId];

        if (!real) {
            // Not played or not resolved yet (a postponed match, or results entered
            // out of order). It never happened, so it neither continues nor breaks
            // the run.
            continue;
        }

        // Already broken earlier this week: nothing left to build on.
        if (broken) continue;

        const userPred = userWeekPreds.find(p => p.match_id === mId);
        if (userPred && userPred.winner === real.winner && userPred.description === real.result) {
            currentStreak++;
        } else {
            broken = true;
            currentStreak = 0;
        }
    }

    breakdown.streakLength = currentStreak;

    // A pleno is worth its size ONCE, not once per match. Paying the difference
    // against the previous length gets there while still scoring prediction by
    // prediction: a run of 8 collects 1 + 0 + 1 + 1 + 0 + 0 = 3 along the way, which
    // is what "más de 5 dará 3 puntos" means.
    breakdown.streak = exports.plenoBonus(currentStreak) - exports.plenoBonus(currentStreak - 1);

    breakdown.total = breakdown.base + breakdown.exact + breakdown.favorite + breakdown.streak;

    return breakdown;
};

/**
 * What one right answer to a weekly question is worth.
 *
 * Flat, and the same for every question: there is no partial credit to give — you
 * either picked the right option or you did not. It lives here, next to the rest of
 * the scoring, so the number exists in exactly one place.
 */
exports.QUESTION_POINTS = 4;

/**
 * What a pleno of a given length is worth, in total.
 *
 * Straight from the 2026 rules: 3 seguidas dan 1 punto, 5 dan 2, más de 5 dan 3. A run
 * of 4 is worth the same as one of 3, which is why the fourth match adds nothing.
 *
 * @param {number} length - Length of the run.
 * @returns {number} Points for the whole pleno.
 */
exports.plenoBonus = (length) => {
    if (length >= 6) return 3;
    if (length === 5) return 2;
    if (length >= 3) return 1;
    return 0;
};

/**
 * Calculates the points earned by a user for a specific match prediction.
 *
 * Takes and returns exactly what it always has; see `calculatePredictionBreakdown`
 * for the same numbers split by origin.
 *
 * @param {Object} params - Same shape as `calculatePredictionBreakdown`.
 * @returns {Promise<number>} The calculated points earned for this prediction.
 */
exports.calculatePredictionPoints = async (params) => {
    const breakdown = await exports.calculatePredictionBreakdown(params);
    return breakdown.total;
};
