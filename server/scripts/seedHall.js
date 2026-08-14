const db = require('../config/configdb');
const User = require('../models/user');
const League = require('../models/league');
const Hall = require('../models/hall');
const { Op } = require('sequelize');

const HISTORICAL_DATA = [
    {
        username: 'Guille',
        leagues: [
            'LEC WINTER 2023',
            'WORLDS 2023',
            'LEC WINTER 2024',
            'LEC SPRING REGULAR 2024',
            'LEC SPRING 2024',
            'LEC FINALS 2024',
            'PACHANGA 24',
            'LEC WINTER 2025',
            'FIRST STAND 2025',
            'LEC SUMMER 2025',
            'PACHANGA 2025'
        ]
    },
    {
        username: 'Fabri',
        leagues: [
            'WORLDS 2022 (EMPATE)',
            'WORLDS 2024',
            'WORLDS 2025'
        ]
    },
    {
        username: 'Samir',
        leagues: [
            'LEC SPRING 2023',
            'LEC SUMMER 2023',
            'LEC VERSUS 2026'
        ]
    },
    {
        username: 'Karim',
        leagues: [
            'MSI 2023',
            'MSI 2025',
            'FIRST STAND 2026'
        ]
    },
    {
        username: 'Aridane',
        leagues: [
            'MSI 2024',
            'LEC SUMMER REGULAR 2024'
        ]
    },
    {
        username: 'Tensi',
        leagues: [
            'WORLDS 2022 (EMPATE)',
            'LEC SUMMER 2024'
        ]
    },
    {
        username: 'Javi',
        leagues: [
            'LEC SPRING 2025'
        ]
    }
];

const seedHall = async () => {
    try {
        await db.authenticate();
        console.log('Database connected successfully.');

        // Sync models so Hall table exists
        await db.sync({ force: false });

        const allUsers = await User.findAll();
        const allLeagues = await League.findAll();

        console.log(`Found ${allUsers.length} users and ${allLeagues.length} leagues in database.`);

        let createdCount = 0;
        let skippedCount = 0;

        for (const playerData of HISTORICAL_DATA) {
            const user = allUsers.find(
                u => u.username.toLowerCase().trim() === playerData.username.toLowerCase().trim()
            );

            if (!user) {
                console.warn(`⚠️ User "${playerData.username}" not found in database. Skipping.`);
                continue;
            }

            for (const compName of playerData.leagues) {
                // Try to find matching league in DB
                const cleanComp = compName.replace(' (EMPATE)', '').toLowerCase().trim();
                const matchedLeague = allLeagues.find(l => {
                    const lName = l.name.toLowerCase().trim();
                    return lName === cleanComp || lName.includes(cleanComp) || cleanComp.includes(lName);
                });

                // Check if already seeded
                const existing = await Hall.findOne({
                    where: {
                        user_id: user.id,
                        competition_name: compName
                    }
                });

                if (existing) {
                    skippedCount++;
                    continue;
                }

                await Hall.create({
                    user_id: user.id,
                    league_id: matchedLeague ? matchedLeague.id : null,
                    competition_name: compName,
                    date: matchedLeague ? matchedLeague.end_date : new Date('2024-01-01')
                });

                createdCount++;
                console.log(`✅ Added: ${user.username} -> ${compName} ${matchedLeague ? `(Linked to League #${matchedLeague.id}: ${matchedLeague.name})` : '(Manual)'}`);
            }
        }

        console.log(`\n🎉 Seed finished! Created: ${createdCount}, Skipped: ${skippedCount}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during Hall seed:', error);
        process.exit(1);
    }
};

seedHall();
