const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const League = sequelize.define('League', {
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
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    logo_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'live', 'finished'),
        defaultValue: 'scheduled'
    },
    rules: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    leaguepedia_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    stats_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Which skin the whole site wears while this competition is alive.
    //
    //   'default'  la web de siempre
    //   'worlds'   el tema del mundial
    //
    // Es lo ÚNICO que enciende el modo Worlds. A partir de ahí no hay que tocar
    // nada más: manda el estado de la liga —que ya se mueve solo con las fechas
    // de inicio y fin— y la web vuelve a la normalidad en cuanto pasa a
    // 'finished'. Se guarda como texto y no como ENUM a propósito: añadir un
    // tema nuevo no debería costar una migración.
    theme: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'default'
    },
    // Whether this competition adds up to the Pachanga season. Worlds has its own
    // prizes and is set to false; everything else counts.
    counts_for_pachanga: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'League',
    timestamps: false,
    underscored: true
});

module.exports = League;