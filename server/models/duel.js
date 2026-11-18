const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * Un duelo: alguien reta a otro de su liga para una jornada. Gana quien haga más
 * puntos en ella y se lleva lo apostado: puntos de liga (de 1 a 3, pasan de uno a otro)
 * o pachanguitas (5, 10 o 20 cada uno, el ganador se lleva el bote).
 *
 * Estados:
 *   pending    retado, esperando respuesta
 *   accepted   aceptado; se resuelve cuando la jornada tiene todos sus resultados
 *   resolved   resuelto (`winner_id`, o null si empataron). Una corrección lo vuelve
 *              a calcular, y si un resultado se borra vuelve a `accepted`
 *   declined   el retado dijo que no
 *   expired    empezó la jornada sin respuesta
 *   cancelled  el retador lo retiró antes de que contestaran
 *   annulled   anulado por un admin: deja de contar
 *
 * La lógica vive en utils/duels.js, que es lo único que escribe aquí.
 */
const Duel = sequelize.define('Duel', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    league_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'League', key: 'id' },
        onDelete: 'CASCADE'
    },
    round_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Round', key: 'id' },
        onDelete: 'CASCADE'
    },
    challenger_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'id' },
        onDelete: 'CASCADE'
    },
    rival_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'id' },
        onDelete: 'CASCADE'
    },
    // 'points' (puntos de liga) o 'coins' (pachanguitas).
    stake_kind: {
        type: DataTypes.STRING(8),
        allowNull: false
    },
    stake: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(12),
        allowNull: false,
        defaultValue: 'pending'
    },
    winner_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    // Si el retador ya ha visto el aviso de «duelo aceptado».
    challenger_seen: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    responded_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'Duel',
    timestamps: false,
    underscored: true,
    indexes: [
        { fields: ['round_id', 'status'] },
        { fields: ['challenger_id'] },
        { fields: ['rival_id'] }
    ]
});

module.exports = Duel;
