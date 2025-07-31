const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const FavoriteTeam = sequelize.define('FavoriteTeam', {
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
    team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Team',
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
    }
}, {
    tableName: 'FavoriteTeam',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'league_id']
        }
    ]
});

module.exports = FavoriteTeam;