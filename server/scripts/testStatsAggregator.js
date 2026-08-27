/**
 * Regression test for utils/statsAggregator.js.
 *
 * Builds a throwaway database, seeds a league whose numbers are known by hand, and
 * checks the aggregator against them. It never touches the real database: it creates
 * `pachanga_stats_test`, uses it and drops it.
 *
 * Needs Postgres running with the same credentials as the app.
 *
 * Usage:
 *   npm run test:stats
 */
const TEST_DB = 'pachanga_stats_test';
const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config();

const USER = process.env.DB_USER || 'postgres';
const PASS = process.env.DB_PASSWORD || 'samir123';
const HOST = process.env.DB_HOST || 'localhost';
const PORT = process.env.DB_PORT || 5432;

let fallos = 0;
const check = (nombre, real, esperado) => {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`${ok ? 'OK  ' : 'FALLO'}  ${nombre.padEnd(46)} ${ok ? '' : `-> ${JSON.stringify(real)} (esperado ${JSON.stringify(esperado)})`}`);
};

const admin = () => new Sequelize('postgres', USER, PASS, { host: HOST, port: PORT, dialect: 'postgres', logging: false });

async function main() {
  // -- throwaway database ---------------------------------------------------
  let a = admin();
  await a.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await a.query(`CREATE DATABASE ${TEST_DB}`);
  await a.close();
  console.log(`Base desechable ${TEST_DB} creada.\n`);

  // configdb reads DB_NAME at require time, so it has to be set first
  process.env.DB_NAME = TEST_DB;

  const sequelize = require('../config/configdb');
  const User = require('../models/user');
  const Team = require('../models/team');
  const League = require('../models/league');
  const Match = require('../models/match');
  const Result = require('../models/result');
  const Prediction = require('../models/prediction');
  const FavoriteTeam = require('../models/favoriteTeam');
  const LeagueParticipation = require('../models/leagueParticipation');
  const PlayerWeekStat = require('../models/playerWeekStat');
  const PlayerLeagueStat = require('../models/playerLeagueStat');
  const MatchStat = require('../models/matchStat');

  const agg = require('../utils/statsAggregator');
  const { calculatePredictionPoints } = require('../utils/pointsCalculator');

  await sequelize.sync({ force: true });

  // -- las reglas del pleno, sin tocar la base -------------------------------
  // Una semana de 10 partidos BO1 (2 pts por acierto, sin bonus de marcador) para
  // aislar el bonus de pleno del resto.
  {
    const { calculatePredictionBreakdown, plenoBonus } = require('../utils/pointsCalculator');

    console.log('--- reglas del pleno ---');
    check('un pleno de 3 vale 1',  plenoBonus(3), 1);
    check('uno de 4 vale lo mismo', plenoBonus(4), 1);
    check('uno de 5 vale 2',       plenoBonus(5), 2);
    check('uno de 8 vale 3, no 12', plenoBonus(8), 3);

    const ids = [901, 902, 903, 904, 905, 906, 907, 908, 909, 910];
    const semana = (aciertos) => {
      const resultMap = {}; const preds = [];
      ids.forEach((id, i) => {
        resultMap[id] = { winner: 1, result: '1-0' };
        preds.push({ id: 1000 + i, user_id: 1, match_id: id, winner: aciertos[i] ? 1 : 2, description: '1-0' });
      });
      return { resultMap, preds };
    };
    const bonusDe = async (aciertos) => {
      const { resultMap, preds } = semana(aciertos);
      let total = 0;
      for (let i = 0; i < ids.length; i++) {
        const b = await calculatePredictionBreakdown({
          prediction: preds[i],
          match: { id: ids[i], league_id: 1, format: 'BO1', date: new Date('2026-01-16') },
          winner: 1, resultStr: '1-0',
          weekMatchIds: ids, resultMap, allWeekPredictions: preds,
        });
        total += b.streak;
      }
      return total;
    };

    const V = true, X = false;
    check('8 seguidas pagan 3 en total', await bonusDe([V,V,V,V,V,V,V,V,X,X]), 3);
    check('5 seguidas pagan 2',          await bonusDe([V,V,V,V,V,X,X,X,X,X]), 2);
    check('4 seguidas pagan 1',          await bonusDe([V,V,V,V,X,X,X,X,X,X]), 1);
    check('2 seguidas no pagan',         await bonusDe([V,V,X,X,X,X,X,X,X,X]), 0);
    check('los 10 pagan 3, no 21',       await bonusDe([V,V,V,V,V,V,V,V,V,V]), 3);

    // Lo que cambió: fallar cierra la semana para plenos.
    check('tras fallar no se abre otro pleno', await bonusDe([V,V,X,V,V,V,V,V,V,V]), 0);
    check('fallar el primero deja la semana a 0', await bonusDe([X,V,V,V,V,V,V,V,V,V]), 0);
    console.log('');
  }

  // -- seed ------------------------------------------------------------------
  await User.bulkCreate([
    { id: 1, username: 'Ana',  email: 'a@a.es', password: 'x' },
    { id: 2, username: 'Bea',  email: 'b@b.es', password: 'x' },
    { id: 3, username: 'Caro', email: 'c@c.es', password: 'x' },
  ]);
  await Team.bulkCreate([1, 2, 3, 4].map(i => ({ id: i, name: `Team ${i}`, acronym: `T${i}` })));

  // 2026-01-15 es jueves, que es donde startOfWeek ancla la semana
  await League.create({ id: 1, name: 'Test League', start_date: '2026-01-15', end_date: '2026-02-28' });

  const partidos = [
    { id: 101, date: '2026-01-16', winner: 1 }, // semana 1
    { id: 102, date: '2026-01-17', winner: 3 },
    { id: 103, date: '2026-01-18', winner: 1 },
    { id: 104, date: '2026-01-19', winner: 2 },
    { id: 105, date: '2026-01-23', winner: 1 }, // semana 2
    { id: 106, date: '2026-01-24', winner: 2 },
  ];
  await Match.bulkCreate(partidos.map(m => ({ id: m.id, league_id: 1, format: 'BO3', date: m.date, status: 'finished' })));
  await Result.bulkCreate(partidos.map(m => ({ match_id: m.id, winner: m.winner, result: '2-1' })));

  // Ana clava los seis. Bea acierta ganador con marcador malo, y falla el 103.
  // Caro solo juega los dos primeros, perfectos.
  const preds = [];
  partidos.forEach(m => preds.push({ user_id: 1, match_id: m.id, winner: m.winner, description: '2-1' }));
  partidos.forEach(m => preds.push({ user_id: 2, match_id: m.id, winner: m.id === 103 ? 3 : m.winner, description: '2-0' }));
  preds.push({ user_id: 3, match_id: 101, winner: 1, description: '2-1' });
  preds.push({ user_id: 3, match_id: 102, winner: 3, description: '2-1' });
  await Prediction.bulkCreate(preds);

  await FavoriteTeam.create({ user_id: 1, team_id: 1, league_id: 1 }); // Ana: Team 1
  await LeagueParticipation.bulkCreate([1, 2, 3].map(u => ({ user_id: u, league_id: 1, week: -1, points: 0 })));

  // -- run ---------------------------------------------------------------------
  const resumen = await agg.recomputeLeague(1);
  console.log(`recomputeLeague -> ${resumen.weeks} semanas, ${resumen.players} jugadores\n`);

  const liga = await PlayerLeagueStat.findAll({ order: [['user_id', 'ASC']] });
  const [ana, bea, caro] = liga;

  console.log('--- totales de liga ---');
  check('Ana · puntos',            ana.points, 34);
  check('Ana · desglose suma el total', ana.points_base + ana.points_exact + ana.points_favorite + ana.points_streak, 34);
  check('Ana · base (6 aciertos x2)', ana.points_base, 12);
  check('Ana · marcador exacto (6x3)', ana.points_exact, 18);
  check('Ana · favorito (101 y 105)', ana.points_favorite, 3);
  check('Ana · pleno (racha de 3)',  ana.points_streak, 1);
  check('Ana · mejor racha',         ana.best_run, 4);
  check('Ana · plenos conseguidos',  ana.plenos, 1);
  check('Ana · marcadores exactos',  ana.exact_scores, 6);
  check('Ana · aciertos',            ana.wins, 6);
  check('Ana · rank',                ana.rank, 1);
  check('Bea · puntos (5 aciertos)', bea.points, 10);
  check('Bea · sin marcadores exactos', bea.exact_scores, 0);
  check('Bea · aciertos',            bea.wins, 5);
  check('Caro · puntos (2 perfectas)', caro.points, 10);
  check('Caro · predicciones',       caro.predictions, 2);
  check('partidos disponibles (todos)', [ana.matches_available, bea.matches_available, caro.matches_available], [6, 6, 6]);

  console.log('\n--- semanas ---');
  const s1 = await PlayerWeekStat.findAll({ where: { league_id: 1, week: 1 }, order: [['user_id', 'ASC']] });
  const s2 = await PlayerWeekStat.findAll({ where: { league_id: 1, week: 2 }, order: [['user_id', 'ASC']] });
  check('semana 1 · puntos de Ana',   s1[0].points, 23);
  check('semana 2 · puntos de Ana',   s2[0].points, 11);
  check('semana 1 · partidos',        s1[0].matches_available, 4);
  check('semana 2 · partidos',        s2[0].matches_available, 2);
  check('semana 1 · mejor racha Ana', s1[0].best_run, 4);
  check('semana 2 · mejor racha Ana', s2[0].best_run, 2);
  check('Caro no juega la semana 2',  s2[2].predictions, 0);

  console.log('\n--- partidos ---');
  const ms = await MatchStat.findAll({ order: [['match_id', 'ASC']] });
  check('101 · predicciones',    ms[0].predictions_count, 3);
  check('101 · aciertos',        ms[0].correct_count, 3);
  check('101 · exactos',         ms[0].exact_count, 2);
  check('101 · unanimidad',      ms[0].top_vote_share, 1);
  check('103 · voto dividido',   ms[2].top_vote_share, 0.5);
  check('103 · un solo acierto', ms[2].correct_count, 1);
  check('semana del 105',        ms[4].week, 2);

  console.log('\n--- contraste con el calculo de referencia ---');
  // Suma con la ruta SIN cache de calculatePredictionPoints: consulta la BD por su
  // cuenta. Si el agregador cachea mal algo, aqui se ve.
  const esperados = { 1: 0, 2: 0, 3: 0 };
  for (const m of partidos) {
    const match = await Match.findByPk(m.id);
    const rs = await Result.findOne({ where: { match_id: m.id } });
    const ps = await Prediction.findAll({ where: { match_id: m.id } });
    for (const p of ps) {
      esperados[p.user_id] += await calculatePredictionPoints({
        prediction: p, match, winner: rs.winner, resultStr: rs.result
      });
    }
  }
  check('Ana  coincide con la ruta sin cache', ana.points, esperados[1]);
  check('Bea  coincide con la ruta sin cache', bea.points, esperados[2]);
  check('Caro coincide con la ruta sin cache', caro.points, esperados[3]);

  console.log('\n--- idempotencia ---');
  const antes = JSON.stringify((await PlayerLeagueStat.findAll({ order: [['user_id', 'ASC']] }))
    .map(r => ({ u: r.user_id, p: r.points, e: r.exact_scores, b: r.best_run, pl: r.plenos, r: r.rank })));
  await agg.recomputeLeague(1);
  await agg.recomputeLeague(1);
  const despues = JSON.stringify((await PlayerLeagueStat.findAll({ order: [['user_id', 'ASC']] }))
    .map(r => ({ u: r.user_id, p: r.points, e: r.exact_scores, b: r.best_run, pl: r.plenos, r: r.rank })));
  check('3 pasadas dan lo mismo', despues, antes);
  check('no se duplican filas de liga', (await PlayerLeagueStat.count()), 3);
  check('no se duplican filas de partido', (await MatchStat.count()), 6);
  check('no se duplican filas de semana', (await PlayerWeekStat.count()), 6);

  console.log('\n--- recompute de un solo partido ---');
  // Cambiar el resultado del 103 tiene que rehacer la semana 1 entera, porque la
  // racha de Ana pasaba por ahi.
  await Result.update({ winner: 3, result: '2-0' }, { where: { match_id: 103 } });
  await agg.recomputeForMatch(103);
  const ana3 = await PlayerLeagueStat.findOne({ where: { user_id: 1 } });
  // El 103 le valia 7 a Ana: 2 base + 3 marcador + 1 favorito + 1 del pleno, que se
  // cerraba justo en ese partido. Al fallarlo pierde los cuatro. 34 - 7 = 27.
  check('Ana baja al romperse el pleno', ana3.points, 27);
  check('Ana · desglose tras el cambio', [ana3.points_base, ana3.points_exact, ana3.points_favorite, ana3.points_streak], [10, 15, 2, 0]);
  check('su mejor racha ahora es 2',     ana3.best_run, 2);
  check('ya no tiene plenos',            ana3.plenos, 0);
  const bea3 = await PlayerLeagueStat.findOne({ where: { user_id: 2 } });
  check('Bea ahora acierta el 103',      bea3.wins, 6);

  // ══════════════════════════════════════════════════════════════════════════
  // El arreglo de verdad: aplicar puntos por diferencia
  // ══════════════════════════════════════════════════════════════════════════
  console.log('');
  console.log('--- aplicar puntos por diferencia ---');

  // volvemos al estado original y dejamos puntos a cero, como si nada se hubiera jugado
  await Result.update({ winner: 1, result: '2-1' }, { where: { match_id: 103 } });
  await Prediction.update({ points: 0 }, { where: {} });
  await LeagueParticipation.destroy({ where: { league_id: 1 } });
  await LeagueParticipation.bulkCreate([1, 2, 3].map(u => ({ user_id: u, league_id: 1, week: -1, points: 0 })));

  // cerrar los seis partidos en orden, como hace el panel de admin
  for (const m of partidos) await agg.applyForMatch(m.id);

  const lpDe = async (u, w = -1) => {
    const r = await LeagueParticipation.findOne({ where: { league_id: 1, user_id: u, week: w } });
    return r ? r.points : null;
  };

  check('cerrar los 6 -> Ana',  await lpDe(1), 34);
  check('cerrar los 6 -> Bea',  await lpDe(2), 10);
  check('cerrar los 6 -> Caro', await lpDe(3), 10);
  check('semanal 1 de Ana',     await lpDe(1, 1), 23);
  check('semanal 2 de Ana es acumulada', await lpDe(1, 2), 34);
  check('Prediction.points se guarda', (await Prediction.findOne({ where: { user_id: 1, match_id: 101 } })).points, 6);

  // EL BUG QUE CAUSO LA DERIVA: cerrar dos veces el mismo partido
  await agg.applyForMatch(101);
  await agg.applyForMatch(101);
  check('cerrar 101 dos veces mas no mueve nada', await lpDe(1), 34);
  check('  ni la fila semanal',                   await lpDe(1, 1), 23);

  // El historico no se reescribe: metemos una desviacion a mano y comprobamos que
  // tocar OTRA semana no la corrige ni la empeora.
  await LeagueParticipation.increment({ points: 50 }, { where: { league_id: 1, user_id: 1, week: -1 } });
  await agg.applyForMatch(105); // semana 2
  check('una desviacion previa se respeta', await lpDe(1), 84);
  await LeagueParticipation.increment({ points: -50 }, { where: { league_id: 1, user_id: 1, week: -1 } });

  // Corregir un resultado ahora mueve los puntos, cosa que antes no pasaba
  await Result.update({ winner: 3, result: '2-1' }, { where: { match_id: 106 } });
  await agg.applyForMatch(106);
  check('corregir el 106 -> Ana pierde 5', await lpDe(1), 29);
  check('corregir el 106 -> Bea pierde 2', await lpDe(2), 8);
  check('la prediccion vale ya 0',
    (await Prediction.findOne({ where: { user_id: 1, match_id: 106 } })).points, 0);

  // Borrar un resultado devuelve sus puntos, cosa que tampoco pasaba
  await Result.destroy({ where: { match_id: 105 } });
  await agg.applyForMatch(105);
  check('borrar el 105 -> Ana pierde 6 mas', await lpDe(1), 23);
  check('borrar el 105 -> Bea pierde 2 mas', await lpDe(2), 6);
  check('Caro no se entera',                 await lpDe(3), 10);

  // y las estadisticas siguieron a los puntos
  const anaFinal = await PlayerLeagueStat.findOne({ where: { user_id: 1 } });
  check('las stats siguen a la clasificacion', anaFinal.points, 23);
  check('points_official refleja la clasificacion', anaFinal.points_official, 23);
  check('sin nada a mano, points_manual = 0', anaFinal.points_manual, 0);

  console.log('');
  console.log('--- puntos finales metidos a mano ---');
  // Al cerrar la liga se anaden a mano los puntos por donde quedo el equipo favorito.
  // El agregador no los calcula: los MIDE, como la diferencia entre lo que dice la
  // clasificacion y lo que suman las predicciones.
  await LeagueParticipation.increment({ points: 20 }, { where: { league_id: 1, user_id: 1, week: -1 } });
  await agg.rollUpLeague(1);

  const anaMano = await PlayerLeagueStat.findOne({ where: { user_id: 1 } });
  const beaMano = await PlayerLeagueStat.findOne({ where: { user_id: 2 } });
  check('los 20 a mano se detectan',             anaMano.points_manual, 20);
  check('points sigue siendo solo predicciones', anaMano.points, 23);
  check('points + manual = clasificacion',       anaMano.points + anaMano.points_manual, anaMano.points_official);
  check('a quien no se le anade nada, 0',        beaMano.points_manual, 0);

  // Y recalcular no se los come: el agregador nunca reescribe la clasificacion.
  await agg.recomputeLeague(1);
  const anaTrasRecalculo = await PlayerLeagueStat.findOne({ where: { user_id: 1 } });
  check('recalcular no borra lo puesto a mano',  anaTrasRecalculo.points_manual, 20);

  await sequelize.close();

  // -- clean up ------------------------------------------------------------
  a = admin();
  await a.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await a.close();
  console.log(`\nBase ${TEST_DB} borrada.`);

  console.log(fallos === 0 ? '\nTodo correcto.' : `\n${fallos} comprobacion(es) mal.`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('\nERROR:', e.message);
  try { const a2 = admin(); await a2.query(`DROP DATABASE IF EXISTS ${TEST_DB}`); await a2.close(); } catch {}
  process.exit(1);
});
