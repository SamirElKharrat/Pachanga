const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * Una carta de un jugador en una liga. Las cartas son de su liga: no pasan a otra y
 * caducan cuando acaba.
 *
 * La lógica vive en utils/cards.js, que es lo único que escribe aquí.
 */
const UserCard = sequelize.define('UserCard', {
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
    // Una clave de CARDS (utils/cards.js): 'escudo', 'gafe', 'doble'… Texto y no
    // ENUM: una carta nueva no debería costar una migración.
    card: {
        type: DataTypes.STRING(16),
        allowNull: false
    },
    //   in_hand   en la mano, se puede jugar
    //   played    jugada en una jornada (ver CardPlay); no vuelve a la mano
    //   expired   la liga acabó sin jugarla
    status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'in_hand'
    },
    // De dónde salió: 'free' (carta gratis por jornada completa), 'admin', y más
    // adelante 'shop' y 'chest'.
    source: {
        type: DataTypes.STRING(16),
        allowNull: false
    },
    // Qué la originó: en las gratis, la jornada (Round.id). Así no se dan dos por la
    // misma jornada.
    source_ref: {
        type: DataTypes.STRING(64),
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'UserCard',
    timestamps: false,
    underscored: true,
    indexes: [
        { fields: ['user_id', 'league_id', 'status'] },
        { fields: ['user_id', 'league_id', 'source', 'source_ref'] }
    ]
});

module.exports = UserCard;
