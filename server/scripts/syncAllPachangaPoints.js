const db = require('../config/configdb');
const User = require('../models/user');
const League = require('../models/league');
const LeagueParticipation = require('../models/leagueParticipation');
const PachangaPoint = require('../models/pachangaPoint');
const { Op } = require('sequelize');

async function syncAllFinishedLeagues() {
    try {
        await db.authenticate();
        console.log('Database connected.');

        // Sync table
        await PachangaPoint.sync({ alter: true });

        // Find all finished leagues
        const finishedLeagues = await League.findAll({
            where: {
                status: 'finished'
            },
            order: [['start_date', 'ASC']]
        });

        console.log(`Found ${finishedLeagues.length} finished leagues.`);

        const pointsDistribution = [
            { pos: 1, pts: 5 },
            { pos: 2, pts: 3 },
            { pos: 3, pts: 1 }
        ];

        for (const league of finishedLeagues) {
            const isWorlds = league.name && league.name.toLowerCase().includes('worlds');
            if (isWorlds) {
                console.log(`[Skip Worlds] ${league.name}`);
                continue;
            }

            const leagueYear = league.start_date ? new Date(league.start_date).getFullYear() : 2026;

            const top3 = await LeagueParticipation.findAll({
                where: {
                    league_id: league.id,
                    week: -1
                },
                order: [['points', 'DESC']],
                limit: 3
            });

            console.log(`League: ${league.name} (Year: ${leagueYear}) - Participants: ${top3.length}`);

            for (let i = 0; i < top3.length; i++) {
                const p = top3[i];
                const dist = pointsDistribution[i];
                if (!dist) continue;

                const existing = await PachangaPoint.findOne({
                    where: {
                        user_id: p.user_id,
                        league_id: league.id
                    }
                });

                if (!existing) {
                    await PachangaPoint.create({
                        user_id: p.user_id,
                        league_id: league.id,
                        competition_name: league.name,
                        year: leagueYear,
                        points: dist.pts,
                        position: dist.pos,
                        date: league.end_date || new Date()
                    });
                    console.log(`  + Awarded ${dist.pts} pts to user ${p.user_id} (Pos ${dist.pos})`);
                } else {
                    console.log(`  = Already recorded: user ${p.user_id} for ${league.name}`);
                }
            }
        }

        console.log('Finished syncing Pachanga points.');
        process.exit(0);
    } catch (err) {
        console.error('Error syncing Pachanga points:', err);
        process.exit(1);
    }
}

syncAllFinishedLeagues();
