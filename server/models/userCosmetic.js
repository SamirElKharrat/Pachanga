const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * Un cosmético que tiene un jugador: un marco de avatar, un color de nombre o un
 * título. Son para siempre y valen en toda la web (no son de una liga).
 *
 * Qué es cada `item_id` lo dice el catálogo de la tienda (utils/shop.js). De cada
 * tipo se lleva puesto uno como mucho (`equipped`).
 */
const UserCosmetic = sequelize.define('UserCosmetic', {
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
    item_id: {
        type: DataTypes.STRING(32),
        allowNull: false
    },
    equipped: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    // De dónde salió: 'shop' (comprado) o 'admin'; en la fase 4, 'chest'.
    source: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'shop'
    },
    acquired_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'UserCosmetic',
    timestamps: false,
    underscored: true,
    indexes: [
        { unique: true, fields: ['user_id', 'item_id'] },
        { fields: ['equipped'] }
    ]
});

module.exports = UserCosmetic;
