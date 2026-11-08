const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Sequelize } = require('sequelize');
const config = require('./config/config');
const db = require('./config/configdb');
const routes = require("./routes");
const User = require('./models/user');
const Role = require('./models/role');
const League = require('./models/league');
const Team = require('./models/team');
const Match = require('./models/match');
const Prediction = require('./models/prediction');
const Result = require('./models/result');
const Hall = require('./models/hall');
const PachangaPoint = require('./models/pachangaPoint');
const PlayerWeekStat = require('./models/playerWeekStat');
const PlayerLeagueStat = require('./models/playerLeagueStat');
const MatchStat = require('./models/matchStat');
const Question = require('./models/question');
const QuestionAnswer = require('./models/questionAnswer');
// No tiene asociaciones: se requiere para que `db.sync` sepa que existe. Quitarlo
// parece limpieza y deja la tabla sin crear en un despliegue nuevo.
const Changelog = require('./models/changelog'); // eslint-disable-line no-unused-vars
const Rule = require('./models/rule');
const Round = require('./models/round');

const app = express();
const PORT = 3001;

// Configuración de la base de datos
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging || false,
  }
);

// Middleware
const ALLOWED_ORIGINS = ['http://localhost:5173', 'https://pachanga.lol'];
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
    /**
     * En producción manda la lista y nada más.
     *
     * En desarrollo vale cualquier puerto de localhost, porque Vite se mueve al 5174
     * en cuanto el 5173 está ocupado (otra instancia abierta, por ejemplo) y entonces
     * el navegador recibe un preflight 204 sin cabecera CORS: un error que no dice en
     * ningún momento que el problema es el puerto.
     */
    origin: (origin, callback) => {
        // Sin Origin: curl, Postman o una petición del mismo origen.
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        if (!isProduction && LOCALHOST.test(origin)) return callback(null, true);

        // `false`, no un Error: así no se manda la cabecera y el navegador bloquea,
        // que es lo que queremos, pero sin devolver un 500 con la traza entera y las
        // rutas del servidor dentro.
        callback(null, false);
    },
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Relaciones
User.belongsToMany(Role, { through: 'UserRoles' });
Role.belongsToMany(User, { through: 'UserRoles' });
const LeagueParticipation = require('./models/leagueParticipation');
User.belongsToMany(League, { through: { model: LeagueParticipation, unique: false } });
League.belongsToMany(User, { through: { model: LeagueParticipation, unique: false } });
Team.belongsToMany(League, { through: 'TeamLeagues' });
League.belongsToMany(Team, { through: 'TeamLeagues' });
Team.belongsToMany(Match, { through: 'TeamMatches' });
Match.belongsToMany(Team, { through: 'TeamMatches' });

// Prediction relations
Prediction.belongsTo(Match, { as: 'Match', foreignKey: 'match_id' });
Match.hasMany(Prediction, { foreignKey: 'match_id' });
Prediction.belongsTo(Team, { as: 'Winner', foreignKey: 'winner' });
Prediction.belongsTo(User, { as: 'User', foreignKey: 'user_id' });
User.hasMany(Prediction, { foreignKey: 'user_id' });

// Result relations
Result.belongsTo(Match, { as: 'Match', foreignKey: 'match_id' });
Match.hasOne(Result, { foreignKey: 'match_id' });
Result.belongsTo(Team, { as: 'Winner', foreignKey: 'winner' });

// Hall relations
Hall.belongsTo(User, { as: 'User', foreignKey: 'user_id' });
User.hasMany(Hall, { as: 'Halls', foreignKey: 'user_id' });
Hall.belongsTo(League, { as: 'League', foreignKey: 'league_id' });
League.hasMany(Hall, { as: 'Halls', foreignKey: 'league_id' });

// PachangaPoint relations
PachangaPoint.belongsTo(User, { as: 'User', foreignKey: 'user_id' });
User.hasMany(PachangaPoint, { as: 'PachangaPoints', foreignKey: 'user_id' });
PachangaPoint.belongsTo(League, { as: 'League', foreignKey: 'league_id' });
League.hasMany(PachangaPoint, { as: 'PachangaPoints', foreignKey: 'league_id' });

// Stats relations — all written by utils/statsAggregator.js
PlayerLeagueStat.belongsTo(User, { as: 'User', foreignKey: 'user_id' });
PlayerLeagueStat.belongsTo(League, { as: 'League', foreignKey: 'league_id' });
League.hasMany(PlayerLeagueStat, { as: 'PlayerStats', foreignKey: 'league_id' });

PlayerWeekStat.belongsTo(User, { as: 'User', foreignKey: 'user_id' });
PlayerWeekStat.belongsTo(League, { as: 'League', foreignKey: 'league_id' });

MatchStat.belongsTo(Match, { as: 'Match', foreignKey: 'match_id' });
Match.hasOne(MatchStat, { as: 'Stat', foreignKey: 'match_id' });
MatchStat.belongsTo(League, { as: 'League', foreignKey: 'league_id' });

// Question relations — las preguntas de la jornada
Question.belongsTo(League, { as: 'League', foreignKey: 'league_id' });
League.hasMany(Question, { as: 'Questions', foreignKey: 'league_id' });

QuestionAnswer.belongsTo(Question, { as: 'Question', foreignKey: 'question_id' });
Question.hasMany(QuestionAnswer, { as: 'Answers', foreignKey: 'question_id' });
QuestionAnswer.belongsTo(User, { as: 'User', foreignKey: 'user_id' });
User.hasMany(QuestionAnswer, { as: 'QuestionAnswers', foreignKey: 'user_id' });

// Rule relations
Rule.belongsTo(League, { as: 'League', foreignKey: 'league_id' });
League.hasMany(Rule, { as: 'Rules', foreignKey: 'league_id' });

// Jornadas: cada partido y cada pregunta pertenecen a una (utils/rounds.js)
Round.belongsTo(League, { as: 'League', foreignKey: 'league_id' });
League.hasMany(Round, { as: 'Rounds', foreignKey: 'league_id' });
Match.belongsTo(Round, { as: 'Round', foreignKey: 'round_id' });
Round.hasMany(Match, { as: 'Matches', foreignKey: 'round_id' });
Question.belongsTo(Round, { as: 'Round', foreignKey: 'round_id' });
Round.hasMany(Question, { as: 'Questions', foreignKey: 'round_id' });

const hallController = require('./controllers/hallController');
const pachangaController = require('./controllers/pachangaController');
const statsAggregator = require('./utils/statsAggregator');
const { advanceLifecycles } = require('./utils/lifecycle');
const { backfillRounds } = require('./utils/rounds');

// Cada cuánto se avanzan ligas y partidos por calendario (ver utils/lifecycle.js).
const LIFECYCLE_INTERVAL_MS = 60 * 1000;

/**
 * Makes sure the columns the models declare actually exist before anything queries
 * them.
 *
 * `db.sync({ force: false })` creates missing TABLES but never adds a column to an
 * existing one. The League model now declares `counts_for_pachanga`, so if the code
 * ships before `npm run migrate` runs, every single League query fails and the whole
 * site goes down. This closes that window: it is idempotent, costs one query on
 * boot, and does nothing once the migration has run.
 */
const ensureStatsSchema = async () => {
  const [columns] = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'League'`
  );

  if (columns.some(c => c.column_name === 'counts_for_pachanga')) return;

  console.log('Añadiendo League.counts_for_pachanga (la migración no se había lanzado)...');
  await db.query(
    `ALTER TABLE "League" ADD COLUMN counts_for_pachanga BOOLEAN NOT NULL DEFAULT true`
  );
  await db.query(
    `UPDATE "League" SET counts_for_pachanga = false WHERE name ILIKE '%worlds%' OR name ILIKE '%mundial%'`
  );
  console.log('Columna añadida. Worlds marcado como no puntuable.');
};

/**
 * Lo mismo que ensureStatsSchema, para League.theme.
 *
 * El modelo ya declara la columna, así que si el código llega a producción antes
 * que `npm run migrate`, TODA consulta de ligas revienta y se cae la web entera.
 * Esto cierra esa ventana: es idempotente, cuesta una consulta al arrancar y no
 * hace nada en cuanto la migración se haya lanzado.
 */
const ensureLeagueTheme = async () => {
  const [columns] = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'League'`
  );

  if (columns.some(c => c.column_name === 'theme')) return;

  console.log('Añadiendo League.theme (la migración no se había lanzado)...');
  await db.query(
    `ALTER TABLE "League" ADD COLUMN theme VARCHAR(255) NOT NULL DEFAULT 'default'`
  );
  await db.query(
    `UPDATE "League" SET theme = 'worlds' WHERE name ILIKE '%worlds%' OR name ILIKE '%mundial%'`
  );
  console.log('Columna añadida. El mundial queda marcado con el tema de Worlds.');
};

/**
 * Lo mismo que las dos de arriba, para `points_question`.
 *
 * `db.sync` crea las tablas Question y QuestionAnswer solas por ser nuevas, pero no
 * añade columnas a PlayerWeekStat ni a PlayerLeagueStat, que ya existen. Y el
 * agregador escribe esa columna en cuanto se cierra cualquier partido, así que sin
 * ella no fallan las preguntas: falla el reparto de puntos entero.
 */
const ensureQuestionPoints = async () => {
  const [columns] = await db.query(
    `SELECT table_name, column_name FROM information_schema.columns
      WHERE table_name IN ('PlayerWeekStat', 'PlayerLeagueStat') AND column_name = 'points_question'`
  );
  const has = (table) => columns.some(c => c.table_name === table);

  for (const table of ['PlayerWeekStat', 'PlayerLeagueStat']) {
    if (has(table)) continue;
    console.log(`Añadiendo ${table}.points_question (la migración no se había lanzado)...`);
    await db.query(`ALTER TABLE "${table}" ADD COLUMN points_question INTEGER NOT NULL DEFAULT 0`);
  }
};

/**
 * Lo mismo, para las preguntas de texto libre y sus estadísticas.
 *
 * Los modelos ya declaran estas columnas, así que sin ellas fallaría cualquier
 * consulta de preguntas o de estadísticas. Idempotente: una consulta por arranque.
 *
 * Además rellena `closed_at` en las preguntas que se corrigieron al crearlas. Hasta
 * ahora «corregida» se leía en `correct_option`, y `closed_at` solo se ponía al
 * editar; ahora `closed_at` es la señal, y sin esto esas preguntas volverían a
 * salir abiertas.
 */
const ensureQuestionColumns = async () => {
  const wanted = {
    Question: {
      answer_type: `VARCHAR(16) NOT NULL DEFAULT 'choice'`,
      accepted_answers: `JSONB NOT NULL DEFAULT '[]'::jsonb`,
    },
    PlayerWeekStat: {
      questions_available: 'INTEGER NOT NULL DEFAULT 0',
      questions_answered: 'INTEGER NOT NULL DEFAULT 0',
      questions_correct: 'INTEGER NOT NULL DEFAULT 0',
    },
    PlayerLeagueStat: {
      questions_available: 'INTEGER NOT NULL DEFAULT 0',
      questions_answered: 'INTEGER NOT NULL DEFAULT 0',
      questions_correct: 'INTEGER NOT NULL DEFAULT 0',
    },
  };

  const [columns] = await db.query(
    `SELECT table_name, column_name FROM information_schema.columns
      WHERE table_name IN ('Question', 'PlayerWeekStat', 'PlayerLeagueStat')`
  );
  const has = (table, column) => columns.some(c => c.table_name === table && c.column_name === column);

  for (const [table, defs] of Object.entries(wanted)) {
    for (const [column, ddl] of Object.entries(defs)) {
      if (has(table, column)) continue;
      console.log(`Añadiendo ${table}.${column} (la migración no se había lanzado)...`);
      await db.query(`ALTER TABLE "${table}" ADD COLUMN ${column} ${ddl}`);
    }
  }

  await db.query(
    `UPDATE "Question" SET closed_at = NOW() WHERE correct_option IS NOT NULL AND closed_at IS NULL`
  );
};

/**
 * Lo mismo, para las jornadas: `round_id` en Match y en Question.
 *
 * La tabla Round la crea `db.sync` sola por ser nueva; las columnas de las tablas
 * que ya existen, no. Los modelos ya las declaran, así que sin esto fallaría
 * cualquier consulta de partidos.
 */
const ensureRoundColumns = async () => {
  const [columns] = await db.query(
    `SELECT table_name FROM information_schema.columns
      WHERE table_name IN ('Match', 'Question') AND column_name = 'round_id'`
  );
  for (const table of ['Match', 'Question']) {
    if (columns.some(c => c.table_name === table)) continue;
    console.log(`Añadiendo ${table}.round_id (la migración no se había lanzado)...`);
    await db.query(`ALTER TABLE "${table}" ADD COLUMN round_id INTEGER REFERENCES "Round" (id)`);
  }
};

/**
 * Fills the stats tables the first time the server boots with them in place.
 *
 * Skips itself as soon as there is a single row, so it costs one COUNT on every
 * later boot. To force a rebuild, run `node scripts/backfillStats.js`.
 */
const syncStatsIfEmpty = async () => {
  try {
    const existing = await PlayerLeagueStat.count();
    if (existing > 0) return;

    const seasons = await statsAggregator.availableSeasons();
    if (seasons.length === 0) return;

    console.log(`Estadísticas vacías: construyendo ${seasons.join(', ')}...`);
    for (const year of seasons) {
      await statsAggregator.recomputeSeason(year);
    }
    console.log('Estadísticas construidas.');
  } catch (error) {
    // Never stop the server from starting because of stats.
    console.error('No se pudieron construir las estadísticas al arrancar:', error.message);
  }
};

// Routes
app.use(routes);

// Sincronizar modelos con la base de datos
const syncDatabase = async () => {
  try {
    // Autenticar la conexión
    await db.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');

    // Sincronizar modelos
    await db.sync({ force: false });
    console.log('Modelos sincronizados correctamente.');

    // Antes de que nada consulte ligas: sync crea tablas, pero no columnas.
    // Va fuera del try de abajo a propósito — con el esquema mal, el servidor no
    // debe arrancar y fingir que todo va bien.
    await ensureStatsSchema();
    await ensureLeagueTheme();
    await ensureQuestionPoints();
    await ensureQuestionColumns();
    await ensureRoundColumns();

    // Auto-inicialización segura en arranque (Render & local)
    try {
      // Todo partido y pregunta sin jornada recibe la de su semana de siempre. La
      // primera vez convierte las semanas en jornadas; después casi no hace nada.
      const filled = await backfillRounds();
      if (filled.matches || filled.questions) {
        console.log(`Jornadas asignadas: ${filled.matches} partidos y ${filled.questions} preguntas.`);
      }

      // Primero, que las ligas que terminaron con el servidor parado pasen a
      // `finished`: lo de abajo solo reparte títulos y puntos de las terminadas.
      await advanceLifecycles();

      if (hallController.seedHistoricalHallIfEmpty) {
        await hallController.seedHistoricalHallIfEmpty();
      }
      if (hallController.syncFinishedLeagueWinners) {
        await hallController.syncFinishedLeagueWinners();
      }
      if (pachangaController.syncAllFinishedLeagues) {
        await pachangaController.syncAllFinishedLeagues();
      }
      console.log('Datos de Hall of Flame y Clasificación sincronizados.');

      // Builds the stats tables on the first boot after deploying. Does nothing
      // once they have rows, so it is safe to leave here forever.
      await syncStatsIfEmpty();
    } catch (syncErr) {
      console.error('Error durante la inicialización de datos:', syncErr);
    }

    // Iniciar el servidor
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    });

    setInterval(advanceLifecycles, LIFECYCLE_INTERVAL_MS);
  } catch (error) {
    console.error('Error al sincronizar con la base de datos:', error);
  }
};

// Iniciar la sincronización
syncDatabase();