const sequelize = require('../config/configdb');

async function run() {
    await sequelize.authenticate();
    console.log('Connected to DB');

    // 1. Get all unique constraints on LeagueParticipation
    const [rows] = await sequelize.query(`
        SELECT conname, contype, pg_get_constraintdef(pg_constraint.oid) as def
        FROM pg_constraint
        JOIN pg_class ON conrelid = pg_class.oid
        WHERE pg_class.relname = 'LeagueParticipation';
    `);
    console.log('Constraints found:');
    rows.forEach(r => console.log(' -', r.conname, `(${r.contype}):`, r.def));

    // 2. Find and drop the unique constraint on (user_id, league_id)
    const uniqueConstraint = rows.find(r =>
        r.contype === 'u' &&
        r.def.includes('user_id') &&
        r.def.includes('league_id') &&
        !r.def.includes('week')
    );

    if (uniqueConstraint) {
        console.log(`Dropping constraint: ${uniqueConstraint.conname}`);
        await sequelize.query(`ALTER TABLE "LeagueParticipation" DROP CONSTRAINT "${uniqueConstraint.conname}";`);
        console.log('Constraint dropped!');
    } else {
        console.log('No matching unique constraint found (may already be fixed).');
    }

    // 3. Add new unique constraint that includes week
    console.log('Adding new unique constraint (user_id, league_id, week)...');
    try {
        await sequelize.query(`
            ALTER TABLE "LeagueParticipation"
            ADD CONSTRAINT "LeagueParticipation_user_league_week_unique"
            UNIQUE ("user_id", "league_id", "week");
        `);
        console.log('New constraint added!');
    } catch (e) {
        console.log('Could not add constraint (may already exist):', e.message);
    }

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
