/**
 * Builds the stats tables from scratch and reports how they compare with the points
 * the site is already showing.
 *
 * It only ever writes to the stats tables. It never touches Prediction, Result or
 * LeagueParticipation, so running it can not change anyone's standings.
 *
 * Usage:
 *   node scripts/backfillStats.js            rebuild everything, then verify
 *   node scripts/backfillStats.js --verify   verify only, touch nothing
 *   node scripts/backfillStats.js --year 2026
 */
const sequelize = require('../config/configdb');

const League = require('../models/league');
const LeagueParticipation = require('../models/leagueParticipation');
const PlayerLeagueStat = require('../models/playerLeagueStat');
const PlayerWeekStat = require('../models/playerWeekStat');
const MatchStat = require('../models/matchStat');

const statsAggregator = require('../utils/statsAggregator');

const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify');
const yearArg = args.indexOf('--year') !== -1 ? parseInt(args[args.indexOf('--year') + 1], 10) : null;

/**
 * Fails early and clearly if the migration has not been run yet.
 */
const checkSchema = async () => {
    const [rows] = await sequelize.query(
        `SELECT table_name, column_name FROM information_schema.columns
         WHERE table_name IN ('League', 'PlayerWeekStat', 'PlayerLeagueStat')`
    );
    const has = (table, column) => rows.some(r => r.table_name === table && r.column_name === column);

    const missing = [];
    if (!has('League', 'counts_for_pachanga')) missing.push('League.counts_for_pachanga');
    if (!has('PlayerWeekStat', 'plenos')) missing.push('PlayerWeekStat.plenos');
    if (!has('PlayerLeagueStat', 'points_official')) missing.push('PlayerLeagueStat.points_official');

    if (missing.length) {
        throw new Error(
            `Faltan columnas: ${missing.join(', ')}.
Lanza primero las migraciones:
  npm run migrate`
        );
    }
};


/**
 * Compares the derived totals against what the standings show.
 *
 * These are ALLOWED to differ, and for the leagues played before the delta fix they
 * do. Back then closing a match incremented the standings blindly, so re-closing one
 * (or deleting and recreating a result) inflated them for good. That drift is frozen
 * on purpose: those leagues were played, their prizes were handed out, and rewriting
 * them now would change winners after the fact.
 *
 * From the delta fix onwards the two stay in step by construction, so a NEW league
 * showing a difference here is a real problem.
 *
 * @param {Array<Object>} leagues
 * @returns {Promise<Array<Object>>} One row per league.
 */
const compare = async (leagues) => {
    const rows = [];

    for (const league of leagues) {
        const [participations, stats] = await Promise.all([
            LeagueParticipation.findAll({ where: { league_id: league.id, week: -1 } }),
            PlayerLeagueStat.findAll({ where: { league_id: league.id } })
        ]);

        const official = {};
        participations.forEach(p => { official[p.user_id] = p.points; });

        let drift = 0;
        let players = 0;
        for (const stat of stats) {
            players++;
            const a = official[stat.user_id];
            if (a !== undefined && a !== stat.points) drift += Math.abs(a - stat.points);
        }

        rows.push({ name: league.name, players, drift });
    }

    return rows;
};

const run = async () => {
    await sequelize.authenticate();
    await checkSchema();

    const allLeagues = await League.findAll({ order: [['start_date', 'ASC']] });
    const leagues = yearArg
        ? allLeagues.filter(l => new Date(l.start_date).getFullYear() === yearArg)
        : allLeagues;

    if (leagues.length === 0) {
        console.log(yearArg ? `No hay ligas de ${yearArg}.` : 'No hay ligas.');
        return;
    }

    if (!verifyOnly) {
        console.log(`Reconstruyendo estadísticas de ${leagues.length} liga(s)...\n`);
        for (const league of leagues) {
            const started = Date.now();
            const summary = await statsAggregator.recomputeLeague(league.id);
            const seconds = ((Date.now() - started) / 1000).toFixed(1);
            console.log(
                `  ${league.name.padEnd(24)} ${String(summary.weeks).padStart(3)} semanas · ` +
                `${String(summary.players).padStart(3)} jugadores · ${seconds}s`
            );
        }
        console.log('');
    }

    // ── Informe ──────────────────────────────────────────────────────────────
    console.log('Comparando con la clasificación que muestra la web...');
    console.log('');
    const rows = await compare(leagues);

    const [weekRows, leagueRows, matchRows] = await Promise.all([
        PlayerWeekStat.count(), PlayerLeagueStat.count(), MatchStat.count()
    ]);

    console.log('  Liga                          jugadores   desviación');
    console.log('  ' + '-'.repeat(52));
    rows.forEach(r => {
        console.log(
            `  ${r.name.slice(0, 28).padEnd(28)} ${String(r.players).padStart(9)} ` +
            `${(r.drift === 0 ? 'cuadra' : `${r.drift} pts`).padStart(12)}`
        );
    });

    const conDeriva = rows.filter(r => r.drift > 0);
    const total = conDeriva.reduce((s, r) => s + r.drift, 0);

    console.log('');
    console.log(`  Filas escritas: ${weekRows} PlayerWeekStat · ${leagueRows} PlayerLeagueStat · ${matchRows} MatchStat`);
    console.log('');

    if (conDeriva.length === 0) {
        console.log('  Todo cuadra con la clasificación.');
    } else {
        console.log(`  ${conDeriva.length} liga(s) con ${total} pts de desviación acumulada.`);
        console.log('');
        console.log('  En las ligas ya jugadas esto es lo esperado, y son tres cosas sumadas:');
        console.log('');
        console.log('    - Los puntos finales por dónde quedó tu equipo favorito, que se meten a');
        console.log('      mano en la clasificación y no salen de ninguna predicción.');
        console.log('    - Lo que la regla vieja de plenos pagaba de más (3 puntos por cada partido');
        console.log('      pasado el quinto, en vez de 3 por el pleno entero).');
        console.log('    - Predicciones duplicadas que en su día puntuaron dos veces.');
        console.log('');
        console.log('  Esas ligas se quedan como están: se jugaron y los premios se repartieron.');
        console.log('  Las pantallas muestran points_official, que es justo lo que ve la');
        console.log('  clasificación, así que no se contradicen en ningún sitio.');
        console.log('');
        console.log('  Una liga NUEVA que aparezca aquí con desviación sí sería un problema.');
    }

};

run()
    .catch(error => {
        console.error('\nERROR:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await sequelize.close();
    });
