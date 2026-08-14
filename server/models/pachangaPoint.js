const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const PachangaPoint = sequelize.define('PachangaPoint', {
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
    year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: () => new Date().getFullYear()
    },
    points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    position: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    date: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'PachangaPoint',
    timestamps: false,
    underscored: true
});

module.exports = PachangaPoint;
