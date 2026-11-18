const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * Una apertura de cofre: quién, de qué liga, qué rareza salió y qué premio dio.
 *
 * El dado lo tira el servidor (utils/chests.js) y queda aquí guardado: sirve para el
 * historial, para el tope de 3 al día y para la garantía (10 seguidas sin nada raro).
 */
const ChestOpen = sequelize.define('ChestOpen', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'id' },
        onDelete: 'CASCADE'
    },
    league_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'League', key: 'id' },
        onDelete: 'CASCADE'
    },
    cost: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // comun | poco | raro | epico | leg
    rarity: {
        type: DataTypes.STRING(8),
        allowNull: false
    },
    // Si salió por la garantía.
    guaranteed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    // coins | card | cosmetic
    prize_kind: {
        type: DataTypes.STRING(12),
        allowNull: false
    },
    // La carta (escudo…) o el id del cosmético; vacío si eran monedas.
    prize_id: {
        type: DataTypes.STRING(32),
        allowNull: true
    },
    // Monedas que se llevó (las del premio, o las de una carta que no cabía o un
    // cosmético repetido). Con el techo lleno puede ser menos de lo que tocaba.
    coins: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // null, 'hand_full' (carta pagada en monedas) o 'duplicate' (cosmético repetido)
    converted: {
        type: DataTypes.STRING(12),
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'ChestOpen',
    timestamps: false,
    underscored: true,
    indexes: [
        { fields: ['user_id', 'created_at'] },
        { fields: ['user_id', 'league_id', 'id'] }
    ]
});

module.exports = ChestOpen;
