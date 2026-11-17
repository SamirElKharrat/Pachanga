const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * Un movimiento de monedas: lo que se gana, se gasta o se corrige.
 *
 * Es un LIBRO, no un saldo: el saldo de cada usuario es la suma de sus movimientos y
 * no se guarda en ningún otro sitio, así que nunca se puede descuadrar. Las filas no
 * se editan ni se borran. Si una recompensa deja de corresponder (una corrección de
 * resultado quita un pleno), se apunta un movimiento de vuelta que la señala con
 * `reverses_id`, y el historial cuenta lo que pasó.
 *
 * La lógica vive en utils/coins.js, que es lo único que escribe aquí.
 */
const CoinTransaction = sequelize.define('CoinTransaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // Con CASCADE: si se borra un usuario, sus monedas se van con él.
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'User', key: 'id' },
        onDelete: 'CASCADE'
    },
    // Positivo al ganar, negativo al gastar o al corregir. Puede ser 0: una
    // recompensa que llega con el techo lleno se apunta igual, para que conste que
    // ya se pagó y no se vuelva a pagar.
    amount: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // Por qué: ver REASONS en utils/coins.js. Texto y no ENUM para poder añadir
    // motivos (la tienda, los cofres) sin migrar el tipo.
    reason: {
        type: DataTypes.STRING(32),
        allowNull: false
    },
    // Qué lo originó, para que la misma recompensa no se pague dos veces:
    // ('day', '2026-11-17'), ('round', '54')… Vacío en los ajustes del admin.
    ref_type: {
        type: DataTypes.STRING(16),
        allowNull: true
    },
    ref_id: {
        type: DataTypes.STRING(64),
        allowNull: true
    },
    // La liga de la que sale, si sale de una. Solo informativo y sin clave foránea:
    // las monedas valen para todas las ligas, y borrar una liga no debe tocarlas.
    league_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    // Si este movimiento deshace otro, cuál.
    reverses_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    // Lo que se enseña debajo del motivo («LEC Winter · Jornada 3», o la nota del
    // admin). Se escribe al crearlo y no se recalcula.
    note: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // El admin que hizo un ajuste a mano.
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'CoinTransaction',
    timestamps: false,
    underscored: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'reason', 'ref_type', 'ref_id'] },
        { fields: ['reverses_id'] }
    ]
});

module.exports = CoinTransaction;
