const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const Result = sequelize.define('Result', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    match_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Match',
            key: 'id'
        }
    },
    winner: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    result: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'Result',
    timestamps: false,
    underscored: true
});

module.exports = Result;
