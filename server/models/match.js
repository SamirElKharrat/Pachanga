const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');
// Por la clave foránea round_id: sin cargar Round antes, `sync` crearía esta tabla
// apuntando a una que no existe.
require('./round');

const Match = sequelize.define('Match', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    format: {
        type: DataTypes.ENUM('BO1', 'BO3', 'BO5'),
        allowNull: false
    },
    league_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'League',
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'live', 'finished'),
        defaultValue: 'scheduled'
    },
    // La jornada a la que pertenece. La decide el admin; la fecha ya no. Null solo en
    // partidos que aún no se han asignado: al arrancar, el servidor les pone la de su
    // semana de siempre (utils/rounds.js, backfillRounds).
    round_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Round',
            key: 'id'
        }
    }
}, {
    tableName: 'Match',
    timestamps: false,
    underscored: true
});

module.exports = Match;