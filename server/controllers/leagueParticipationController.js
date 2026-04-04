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

exports.getLeagueParticipationsByLeague = async (req, res) => {
    const { leagueId } = req.params;
    const { week } = req.query; // Optional: filter to a specific week

    try {
        const targetWeek = (week !== undefined && week !== "null") ? parseInt(week, 10) : -1;

        // 1. Obtener todos los miembros de la liga basándonos en el marcador de membresía (week = -1)
        // o cualquier registro que tengan en la liga por si un usuario antiguo no tiene week=-1
        const allParticipations = await leagueParticipation.findAll({
            where: { league_id: leagueId }
        });

        if (allParticipations.length === 0) return res.json([]);

        // Usamos un Set para obtener todos los user_id únicos que están en la liga
        const uniqueUserIds = [...new Set(allParticipations.map(p => p.user_id))];

        // Helper para obtener los puntos para una semana.
        // Si es semana 1 y no hay puntos o no existe, mostrar puntos de week = -1 (membresía)
        // Para otras semanas: mostrar puntos de esa semana específica
        const getPointsForWeek = (userId, target) => {
            if (target === 1) {
                const week1Points = allParticipations
                    .filter(p => p.user_id === userId && p.week === 1)
                    .reduce((acc, current) => acc + current.points, 0);

                return week1Points === 0
                    ? allParticipations
                        .filter(p => p.user_id === userId && p.week === -1)
                        .reduce((acc, current) => acc + current.points, 0)
                    : week1Points;
            } else {
                return allParticipations
                    .filter(p => p.user_id === userId && p.week === target)
                    .reduce((acc, current) => acc + current.points, 0);
            }
        };

        // 2. Obtener los datos de puntos para la semana seleccionada
        const currentPointsMap = {};
        uniqueUserIds.forEach(uid => {
            currentPointsMap[uid] = getPointsForWeek(uid, targetWeek);
        });

        // 3. Calcular ranking actual basado en los puntos de la semana
        const rankedUsers = [...uniqueUserIds]
            .map(uid => ({ user_id: uid, points: currentPointsMap[uid] }))
            .sort((a, b) => b.points - a.points);

        const rankMap = {};
        rankedUsers.forEach((u, i) => { rankMap[u.user_id] = i + 1; });

        // 4. Obtener datos de la semana anterior para calcular movimiento (si aplica)
        let prevRankMap = null;
        if (targetWeek > 1) {
            const prevRanked = [...uniqueUserIds]
                .map(uid => ({ user_id: uid, points: getPointsForWeek(uid, targetWeek - 1) }))
                .sort((a, b) => b.points - a.points);

            prevRankMap = {};
            prevRanked.forEach((u, i) => { prevRankMap[u.user_id] = i + 1; });
        }

        // 5. Cargar info de usuarios
        const users = await User.findAll({ where: { id: uniqueUserIds } });
        const userMap = {};
        users.forEach(u => { if (u) userMap[u.id] = u; });

        // 6. Construir respuesta
        const response = rankedUsers.map(({ user_id, points }) => {
            const rank = rankMap[user_id];
            const prevRank = prevRankMap ? prevRankMap[user_id] : null;

            let movement = null;
            if (prevRank !== null) {
                if (rank < prevRank) movement = 'up';
                else if (rank > prevRank) movement = 'down';
                else movement = 'same';
            }

            // Encuentra cualquier participation ID para este usuario, prefiere la de la targetWeek (o la más cercana anterior)
            const userValidRows = allParticipations.filter(r => r.user_id === user_id && r.week <= targetWeek && r.week !== -1);
            if (userValidRows.length > 0) {
                userValidRows.sort((a, b) => b.week - a.week);
            }
            const participationRow = (userValidRows.length > 0 ? userValidRows[0] : null)
                || allParticipations.find(r => r.user_id === user_id);

            return {
                id: participationRow?.id || user_id,
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
