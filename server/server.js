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
app.use(cors({
    origin: ['http://localhost:5173', 'https://pachanga.lol'],
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


// Routes
app.use(routes);

// Sincronizar modelos con la base de datos
const syncDatabase = async () => {
  try {
    // Autenticar la conexión
    await db.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');

    // Sincronizar modelos
    await db.sync({ force: false }); // Usar { force: true } solo en desarrollo para recrear tablas
    console.log('Modelos sincronizados correctamente.');

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