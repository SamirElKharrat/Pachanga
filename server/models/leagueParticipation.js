const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const LeagueParticipation = sequelize.define('LeagueParticipation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    league_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'League',
            key: 'id'
        }
    },
    week: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    points: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
}, {
    tableName: 'LeagueParticipation',
    timestamps: false,
    underscored: true
});

module.exports = LeagueParticipation;