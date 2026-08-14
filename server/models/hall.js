const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const Hall = sequelize.define('Hall', {
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
        allowNull: true,
        references: {
            model: 'League',
            key: 'id'
        }
    },
    competition_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    date: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'Hall',
    timestamps: false,
    underscored: true
});

module.exports = Hall;
