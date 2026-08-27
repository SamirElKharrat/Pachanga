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


const hallController = require('./controllers/hallController');
const pachangaController = require('./controllers/pachangaController');
const statsAggregator = require('./utils/statsAggregator');

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

    // Auto-inicialización segura en arranque (Render & local)
    try {
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
  } catch (error) {
    console.error('Error al sincronizar con la base de datos:', error);
  }
};

// Iniciar la sincronización
syncDatabase();