const PachangaPoint = require('../models/pachangaPoint');
const User = require('../models/user');
const League = require('../models/league');
const LeagueParticipation = require('../models/leagueParticipation');
const Rule = require('../models/rule');
const { Sequelize, Op } = require('sequelize');

/**
 * Get full Pachanga standings grouped by user for a specific year
 */
exports.getStandings = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const year = parseInt(req.query.year, 10) || currentYear;

        // Fetch all points for the target year
        const pointEntries = await PachangaPoint.findAll({
            where: { year },
            include: [{
                model: User,
                as: 'User',
                attributes: ['id', 'username', 'logo_url']
            }],
            order: [['date', 'DESC'], ['id', 'DESC']]
        });

        // Group points by user
        const userMap = {};
        pointEntries.forEach(entry => {
            const uid = entry.user_id;
            if (!userMap[uid]) {
                userMap[uid] = {
                    id: uid,
                    username: entry.User?.username || `Usuario #${uid}`,
                    logo_url: entry.User?.logo_url || null,
                    totalPoints: 0,
                    breakdown: []
                };
            }
            userMap[uid].totalPoints += entry.points;
            userMap[uid].breakdown.push({
                id: entry.id,
                competition_name: entry.competition_name,
                points: entry.points,
                position: entry.position,
                league_id: entry.league_id,
                date: entry.date
            });
        });

        // Sort by total points descending
        const standings = Object.values(userMap)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map((player, idx) => ({
                ...player,
                rank: idx + 1
            }));

        // Get available years from PachangaPoint and Leagues
        const pointYears = await PachangaPoint.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('year')), 'year']],
            raw: true
        });

        const leagueYears = await League.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.fn('EXTRACT', Sequelize.literal('YEAR FROM start_date'))), 'year']],
            raw: true
        });

        const yearsSet = new Set([currentYear]);
        pointYears.forEach(r => r.year && yearsSet.add(parseInt(r.year, 10)));
        leagueYears.forEach(r => r.year && yearsSet.add(parseInt(r.year, 10)));
        const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

        res.json({
            year,
            availableYears,
            standings
        });
    } catch (error) {
        console.error("Error in getStandings:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Manually create a point entry (Admin only)
 */
exports.createPointEntry = async (req, res) => {
    try {
        const { user_id, competition_name, points, position, year, league_id, date } = req.body;

        if (!user_id || !competition_name || points === undefined) {
            return res.status(400).json({ error: 'user_id, competition_name y points son obligatorios' });
        }

        const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

        const entry = await PachangaPoint.create({
            user_id,
            competition_name,
            points: parseInt(points, 10),
            position: position ? parseInt(position, 10) : null,
            year: targetYear,
            league_id: league_id || null,
            date: date ? new Date(date) : new Date()
        });

        res.status(201).json(entry);
    } catch (error) {
        console.error("Error in createPointEntry:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete a point entry (Admin only)
 */
exports.deletePointEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await PachangaPoint.findByPk(id);
        if (!entry) {
            return res.status(404).json({ error: 'Registro de puntos no encontrado' });
        }

        await entry.destroy();
        res.json({ message: 'Puntos eliminados correctamente' });
    } catch (error) {
        console.error("Error in deletePointEntry:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Auto-sync Pachanga points for finished leagues (excluding Worlds)
 */
exports.syncFinishedLeaguePachangaPoints = async (leagueId) => {
    try {
        const league = await League.findByPk(leagueId);
        if (!league || league.status !== 'finished') return;

        // Worlds does NOT count for Pachanga standings
        const isWorlds = league.name && league.name.toLowerCase().includes('worlds');
        if (isWorlds) {
            console.log(`[Pachanga] Skipping Pachanga points for ${league.name} (Worlds exclusion)`);
            return;
        }

        const leagueYear = league.start_date ? new Date(league.start_date).getFullYear() : new Date().getFullYear();

        // Get top 3 participants from week = -1
        const topParticipants = await LeagueParticipation.findAll({
            where: {
                league_id: leagueId,
                week: -1
            },
            order: [['points', 'DESC']],
            limit: 3
        });

        if (!topParticipants || topParticipants.length === 0) return;

        const pointsDistribution = [
            { pos: 1, pts: 5 },
            { pos: 2, pts: 3 },
            { pos: 3, pts: 1 }
        ];

        for (let i = 0; i < topParticipants.length; i++) {
            const p = topParticipants[i];
            const dist = pointsDistribution[i];
            if (!dist) continue;

            const existing = await PachangaPoint.findOne({
                where: {
                    user_id: p.user_id,
                    league_id: leagueId
                }
            });

            if (!existing) {
                await PachangaPoint.create({
                    user_id: p.user_id,
                    league_id: leagueId,
                    competition_name: league.name,
                    year: leagueYear,
                    points: dist.pts,
                    position: dist.pos,
                    date: league.end_date || new Date()
                });
                console.log(`[Pachanga] Awarded ${dist.pts} pts to user ${p.user_id} for ${league.name} (Pos: ${dist.pos})`);
            }
        }
    } catch (error) {
        console.error("Error in syncFinishedLeaguePachangaPoints:", error);
    }
};

/**
 * Get rules for a specific year (Pachanga general rules)
 */
exports.getRules = async (req, res) => {
    try {
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        const rules = await Rule.findAll({
            where: {
                league_id: null,
                year
            },
            order: [['order_num', 'ASC'], ['id', 'ASC']]
        });

        res.json({
            year,
            rules
        });
    } catch (error) {
        console.error("Error in getRules:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Helper to sync all finished leagues (called on startup)
 */
exports.syncAllFinishedLeagues = async () => {
    try {
        const finishedLeagues = await League.findAll({
            where: { status: 'finished' }
        });

        for (const league of finishedLeagues) {
            await exports.syncFinishedLeaguePachangaPoints(league.id);
        }
    } catch (error) {
        console.error("Error syncing all finished leagues for Pachanga:", error);
    }
};

