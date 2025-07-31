const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

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
    }
}, {
    tableName: 'Match',
    timestamps: false,
    underscored: true
});

module.exports = Match;