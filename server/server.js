const express = require('express');
const cors = require('cors');
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
app.use(cors());
app.use(express.json());

// Relaciones
User.belongsToMany(Role, { through: 'UserRoles' });
Role.belongsToMany(User, { through: 'UserRoles' });
User.belongsToMany(League, { through: 'LeagueParticipation' });
League.belongsToMany(User, { through: 'LeagueParticipation' });
Team.belongsToMany(League, { through: 'TeamLeagues' });
League.belongsToMany(Team, { through: 'TeamLeagues' });
Team.belongsToMany(Match, { through: 'TeamMatches' });
Match.belongsToMany(Team, { through: 'TeamMatches' });


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