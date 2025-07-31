const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const Team = sequelize.define('Team', {
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
    acronym: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    logo_url: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'Team',
    timestamps: false,
    underscored: true
});

module.exports = Team;