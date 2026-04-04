const leagueParticipation = require('../models/leagueParticipation');
const User = require('../models/user');
const League = require('../models/league');
const { authenticateJwtToken } = require('../middlewares/auth');
const sequelize = require('../config/configdb');
const { Op } = require('sequelize');


// Get user's participation in a league (aggregated)
exports.getLeagueParticipation = async (req, res) => {
    const { userId, leagueId } = req.params;

    try {
        const participations = await leagueParticipation.findAll({
            where: { user_id: userId, league_id: leagueId }
        });

        if (!participations || participations.length === 0) {
            return res.status(404).json({ error: 'Participation not found' });
        }

        const totalPoints = participations.reduce((sum, p) => sum + p.points, 0);

        // Return a shape that the frontend expects
        res.json({
            id: participations[0].id,
            user_id: userId,
            league_id: leagueId,
            points: totalPoints
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all participations for a user (aggregated per league)
exports.getLeagueParticipations = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { email: req.user.email }
        });

        const participations = await leagueParticipation.findAll({
            where: { user_id: user.id },
            attributes: [
                'user_id',
                'league_id',
                [sequelize.fn('sum', sequelize.col('points')), 'points']
            ],
            group: ['user_id', 'league_id']
        });

        // Parse points back to numbers instead of string from SUM
        const formatted = participations.map(p => ({
            ...p.toJSON(),
            points: parseInt(p.points, 10)
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//Get all participations for a league — supports optional ?week=N query param
exports.getLeagueParticipationsByLeague = async (req, res) => {
    const { leagueId } = req.params;
    const { week } = req.query; // Optional: filter to a specific week

    try {
        const targetWeek = (week !== undefined && week !== "null") ? parseInt(week, 10) : -1;

        // 1. Obtener los datos acumulados de la semana seleccionada
        let currentWeekRows = await leagueParticipation.findAll({
            where: { league_id: leagueId, week: targetWeek }
        });

        // Si no hay datos y no es week = -1, usar week = -1
        if (currentWeekRows.length === 0 && targetWeek !== -1) {
            currentWeekRows = await leagueParticipation.findAll({
                where: { league_id: leagueId, week: -1 }
            });
        }

        // Mapear user_id -> points (puntos_acumulados)
        const currentPointsMap = {};
        const userIds = currentWeekRows.map(r => {
            currentPointsMap[r.user_id] = r.points;
            return r.user_id;
        });

        // 2. Calcular ranking actual basado en esos puntos acumulados
        const rankedUsers = [...userIds]
            .map(uid => ({ user_id: uid, points: currentPointsMap[uid] }))
            .sort((a, b) => b.points - a.points);

        const rankMap = {};
        rankedUsers.forEach((u, i) => { rankMap[u.user_id] = i + 1; });

        // 3. Obtener datos de la semana anterior para calcular movimiento (si aplica)
        let prevRankMap = null;
        if (targetWeek > 1) {
            const prevRows = await leagueParticipation.findAll({
                where: { league_id: leagueId, week: targetWeek - 1 }
            });
            if (prevRows.length > 0) {
                const prevRanked = prevRows
                    .map(r => ({ user_id: r.user_id, points: r.points }))
                    .sort((a, b) => b.points - a.points);
                prevRankMap = {};
                prevRanked.forEach((u, i) => { prevRankMap[u.user_id] = i + 1; });
            }
        }

        // 4. Cargar info de usuarios
        const users = await User.findAll({ where: { id: userIds } });
        const userMap = {};
        users.forEach(u => { if (u) userMap[u.id] = u; });

        // 5. Construir respuesta
        const response = rankedUsers.map(({ user_id, points }) => {
            const rank = rankMap[user_id];
            const prevRank = prevRankMap ? prevRankMap[user_id] : null;

            let movement = null;
            if (prevRank !== null) {
                if (rank < prevRank) movement = 'up';
                else if (rank > prevRank) movement = 'down';
                else movement = 'same';
            }

            return {
                id: currentWeekRows.find(r => r.user_id === user_id)?.id || user_id,
                user_id,
                league_id: parseInt(leagueId, 10),
                points,
                rank,
                prevRank,
                movement,
                User: userMap[user_id] || null
            };
        });

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.joinLeague = async (req, res) => {
    const { user_id, league_id } = req.body;

    try {
        const existingParticipation = await leagueParticipation.findOne({
            where: { user_id, league_id }
        });

        if (existingParticipation) {
            return res.status(400).json({ error: 'User already joined the league' });
        }

        // Crear una fila con week=-1 como marcador de membresía (no cuenta para puntos).
        // Esto nos permite saber quién está en la liga sin mezclar datos con las semanas reales.
        let participation = await leagueParticipation.create({
            user_id,
            league_id,
            week: -1,
            points: 0
        });

        res.status(200).json(participation);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.leaveLeague = async (req, res) => {
    const { user_id, league_id } = req.body;

    try {
        const count = await leagueParticipation.destroy({
            where: { user_id, league_id }
        });

        if (count === 0) {
            return res.status(404).json({ error: 'Participation not found' });
        }

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
