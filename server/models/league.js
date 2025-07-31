const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const League = sequelize.define('League', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    logo_url: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'League',
    timestamps: false,
    underscored: true
});

module.exports = League;