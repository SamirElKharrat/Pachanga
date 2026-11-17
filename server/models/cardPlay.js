const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * Una carta jugada en una jornada: cuál, sobre qué partido y contra quién.
 *
 * El agregador lee las jugadas de cada jornada al puntuarla (utils/cards.js,
 * cardPoints), así que una jugada nueva, retirada o anulada se recalcula sola, por
 * diferencia, como cualquier otro punto.
 *
 * Retirar una carta (antes de que empiece su partido) borra la fila y la carta vuelve
 * a la mano. Anularla (el admin) la deja con `status: 'annulled'`: no cuenta, pero
 * consta.
 */
const CardPlay = sequelize.define('CardPlay', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_card_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'UserCard', key: 'id' },
        onDelete: 'CASCADE'
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
    round_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Round', key: 'id' },
        onDelete: 'CASCADE'
    },
    // Copia de UserCard.card, para no tener que unir tablas al puntuar.
    card: {
        type: DataTypes.STRING(16),
        allowNull: false
    },
    // El partido al que se aplica (Doble, Doble Dorada, Gafe, Chivato). Vacío en el
    // Escudo, que es de toda la jornada.
    match_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Match', key: 'id' },
        onDelete: 'CASCADE'
    },
    // El rival, en los castigos (Gafe).
    target_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'User', key: 'id' },
        onDelete: 'CASCADE'
    },
    //   active     cuenta
    //   annulled   anulada por el admin: no cuenta
    status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'active'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'CardPlay',
    timestamps: false,
    underscored: true,
    indexes: [
        { unique: true, fields: ['user_card_id'] },
        { fields: ['league_id', 'round_id'] },
        { fields: ['target_user_id', 'round_id'] }
    ]
});

module.exports = CardPlay;
