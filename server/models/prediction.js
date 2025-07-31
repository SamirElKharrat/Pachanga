const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const Prediction = sequelize.define('Prediction', {
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
    type: {
        type: DataTypes.ENUM('question', 'score'),
        defaultValue: 'score',
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    points: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'Prediction',
    timestamps: false,
    underscored: true
});

module.exports = Prediction;