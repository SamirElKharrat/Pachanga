const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const Rule = sequelize.define('Rule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    league_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'League',
            key: 'id'
        }
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: () => new Date().getFullYear()
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'general'
    },
    order_num: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'Rule',
    timestamps: false,
    underscored: true
});

module.exports = Rule;
