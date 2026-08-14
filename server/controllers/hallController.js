const Hall = require('../models/hall');
const User = require('../models/user');
const League = require('../models/league');
const LeagueParticipation = require('../models/leagueParticipation');
const sequelize = require('../config/configdb');
const { Op } = require('sequelize');

/**
 * Automatically inspects finished leagues and assigns Hall entries to the winner(s)
 * if not already recorded.
 */
const syncFinishedLeagueWinners = async () => {
    try {
        const finishedLeagues = await League.findAll({
            where: { status: 'finished' }
        });

        for (const league of finishedLeagues) {
            // Check if there is already at least one Hall entry for this league
            const existingHall = await Hall.findOne({
                where: { league_id: league.id }
            });

            if (!existingHall) {
                // Find participants and their total points (week = -1 represents accumulated points)
                let participations = await LeagueParticipation.findAll({
                    where: { league_id: league.id, week: -1 }
                });

                // Fallback: if no week -1, aggregate by sum
                if (!participations || participations.length === 0) {
                    participations = await LeagueParticipation.findAll({
                        where: { league_id: league.id },
                        attributes: [
                            'user_id',
                            [sequelize.fn('sum', sequelize.col('points')), 'points']
                        ],
                        group: ['user_id']
                    });
                }

                if (participations && participations.length > 0) {
                    const parsed = participations.map(p => ({
                        user_id: p.user_id,
                        points: parseInt(p.points || 0, 10)
                    }));

                    const maxPoints = Math.max(...parsed.map(p => p.points));

                    if (maxPoints > 0) {
                        const winners = parsed.filter(p => p.points === maxPoints);
                        for (const winner of winners) {
                            await Hall.create({
                                user_id: winner.user_id,
                                league_id: league.id,
                                competition_name: league.name,
                                date: league.end_date || new Date()
                            });
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error auto-syncing finished league winners:', error);
    }
};

/**
 * Get all Hall of Flame entries, grouped by player with win stats
 */
exports.getAllHallEntries = async (req, res) => {
    try {
        // First, auto-sync any finished leagues that might not have a Hall record yet
        await syncFinishedLeagueWinners();

        // 1. Calculate total competitions: finished leagues in DB + manual Hall entries (league_id is null)
        const finishedLeaguesCount = await League.count({
            where: { status: 'finished' }
        });

        const manualCompetitionsCount = await Hall.count({
            where: { league_id: null }
        });

        const totalCompetitions = (finishedLeaguesCount + manualCompetitionsCount) || 1;

        // 2. Fetch all Hall records with User and League
        const allHallRecords = await Hall.findAll({
            include: [
                {
                    model: User,
                    as: 'User',
                    attributes: ['id', 'username', 'logo_url', 'email']
                },
                {
                    model: League,
                    as: 'League',
                    attributes: ['id', 'name', 'status', 'logo_url']
                }
            ],
            order: [['date', 'DESC'], ['id', 'DESC']]
        });

        // 3. Group by user
        const playersMap = {};

        allHallRecords.forEach(record => {
            if (!record.User) return;
            const uid = record.User.id;

            if (!playersMap[uid]) {
                playersMap[uid] = {
                    id: record.User.id,
                    username: record.User.username,
                    logo_url: record.User.logo_url,
                    email: record.User.email,
                    wins: 0,
                    trophies: []
                };
            }

            playersMap[uid].wins += 1;
            playersMap[uid].trophies.push({
                id: record.id,
                competition_name: record.competition_name,
                date: record.date,
                league_id: record.league_id,
                league: record.League ? {
                    id: record.League.id,
                    name: record.League.name,
                    status: record.League.status,
                    logo_url: record.League.logo_url
                } : null
            });
        });

        // 4. Transform to sorted array
        const sortedPlayers = Object.values(playersMap)
            .map(player => {
                const winRate = Number(((player.wins / totalCompetitions) * 100).toFixed(1));
                return {
                    ...player,
                    winRate
                };
            })
            .sort((a, b) => b.wins - a.wins);

        res.json({
            players: sortedPlayers,
            totalCompetitions,
            finishedLeaguesCount,
            manualCompetitionsCount
        });
    } catch (error) {
        console.error('Error fetching Hall of Flame entries:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Create a new Hall of Flame entry (Admin only)
 */
exports.createHallEntry = async (req, res) => {
    try {
        const { user_id, competition_name, league_id, date } = req.body;

        if (!user_id || !competition_name) {
            return res.status(400).json({ error: 'user_id and competition_name are required' });
        }

        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let verifiedLeagueId = null;
        if (league_id) {
            const league = await League.findByPk(league_id);
            if (league) {
                verifiedLeagueId = league.id;
            }
        }

        const hallEntry = await Hall.create({
            user_id: user.id,
            competition_name: competition_name.trim(),
            league_id: verifiedLeagueId,
            date: date ? new Date(date) : new Date()
        });

        const fullEntry = await Hall.findByPk(hallEntry.id, {
            include: [
                { model: User, as: 'User', attributes: ['id', 'username', 'logo_url'] },
                { model: League, as: 'League', attributes: ['id', 'name', 'status'] }
            ]
        });

        res.status(201).json(fullEntry);
    } catch (error) {
        console.error('Error creating Hall entry:', error);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Delete a Hall entry (Admin only)
 */
exports.deleteHallEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await Hall.findByPk(id);
        if (!entry) {
            return res.status(404).json({ error: 'Hall entry not found' });
        }

        await entry.destroy();
        res.status(200).json({ success: true, message: 'Hall entry deleted' });
    } catch (error) {
        console.error('Error deleting Hall entry:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.syncFinishedLeagueWinners = syncFinishedLeagueWinners;
