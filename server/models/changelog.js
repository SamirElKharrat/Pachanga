const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * Una línea de las novedades de la web.
 *
 * Una fila es UN cambio, no una versión: la versión es solo la etiqueta que agrupa,
 * y por eso se repite. Partirlo en dos tablas —versiones y cambios— sería un uno a
 * muchos de verdad, pero a cambio de un join y una pantalla más en el panel para
 * gestionar cinco filas al año. Agrupar por `version` al pintarlo sale mucho más
 * barato.
 *
 * La versión que enseña la web es la de la entrada más reciente. No hay ningún sitio
 * aparte donde apuntarla, para que no puedan contradecirse.
 */
const Changelog = sequelize.define('Changelog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // La etiqueta, tal cual se escribe: '1.4'. Texto y no número porque '1.10' va
    // después de '1.9' para una persona y antes para un ordenador.
    version: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Ordena las versiones entre sí. Por eso es una fecha de verdad y no el texto
    // «agosto 2026»: ordenar por el nombre del mes no lleva a ninguna parte.
    release_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    // Qué clase de cambio es. Se llama `kind` y no `type` a propósito: el formulario
    // genérico del panel ya reserva `type` para el de las predicciones.
    //
    //   'new'     algo que antes no existía
    //   'change'  algo que ya existía y ahora se comporta distinto
    //   'fix'     algo que estaba roto
    kind: {
        type: DataTypes.ENUM('new', 'change', 'fix'),
        allowNull: false,
        defaultValue: 'new'
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    tableName: 'Changelog',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            fields: ['release_date']
        }
    ]
});

module.exports = Changelog;
