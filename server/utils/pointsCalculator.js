const { Op } = require('sequelize');
const FavoriteTeam = require('../models/favoriteTeam');
const Match = require('../models/match');
const Result = require('../models/result');
const Prediction = require('../models/prediction');
const { startOfWeek, endOfWeek } = require('../controllers/weekController');

/**
 * Calculates the points earned by a user for a specific match prediction.
 * 
 * @param {Object} params
 * @param {Object} params.prediction - The user's prediction object.
 * @param {Object} params.match - The match object being resolved.
 * @param {number} params.winner - The ID of the winning team for the match.
 * @param {string} params.resultStr - The exact result string (e.g., '2-0', '3-1').
 * @param {Array<Object>} [params.weekMatchIds] - Optional pre-fetched array of match IDs for the week in chronological order.
 * @param {Object} [params.resultMap] - Optional pre-fetched map of matchId -> winnerId for the week's results.
 * @param {Array<Object>} [params.allWeekPredictions] - Optional pre-fetched array of all predictions for the week.
 * @returns {Promise<number>} The calculated points earned for this prediction.
 */
exports.calculatePredictionPoints = async ({
    prediction,
    match,
    winner,
    resultStr,
    weekMatchIds = null,
    resultMap = null,
    allWeekPredictions = null
}) => {
    let points = 0;

    // Check if the user predicted the correct winner
    if (prediction.winner !== winner) {
        return points; // 0 points if winner is wrong
    }

    // Base points for correct winner
    points += 2;

    const isPerfect = (resultStr === prediction.description);

    // 1. Favorite Team Bonus (STRICT: Only if perfect hit)
    if (isPerfect) {
        const favoriteTeam = await FavoriteTeam.findOne({
            where: {
                user_id: prediction.user_id,
                league_id: match.league_id,
                team_id: prediction.winner
            }
        });

        if (favoriteTeam) {
            points += 1;
        }
    }

    // 2. Exact Score Bonus (BO3 or BO5)
    if (isPerfect) {
        switch (match.format) {
            case 'BO3':
                points += 3;
                break;
            case 'BO5':
                points += 5;
                break;
        }
    }

    // 3. Perfect Streak Bonus Calculation (Plenos)
    // STRICT: Only perfect hits keep the streak alive.
    
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
    let currentStreak = 0;

    const userWeekPreds = allWeekPredictions.filter(p => p.user_id === prediction.user_id);

    // Check all matches chronologically up to the current one
    for (let i = 0; i <= currentMatchIndex; i++) {
        const mId = weekMatchIds[i];
        const userPred = userWeekPreds.find(p => p.match_id === mId);
        const real = resultMap[mId];

        if (userPred && real && userPred.winner === real.winner && userPred.description === real.result) {
            // Perfect hit -> streak continues
            currentStreak++;
        } else {
            // Any miss (winner or score) -> streak breaks
            currentStreak = 0;
        }
    }

    // Streak bonuses — 2026 Rules:
    // 3 consecutive perfect predictions → +1 point
    // 5 consecutive perfect predictions → +2 points
    // >5 consecutive perfect predictions → +3 points
    if (currentStreak === 3) points += 1; 
    if (currentStreak === 5) points += 2; 
    if (currentStreak > 5) points += 3; 

    return points;
};
