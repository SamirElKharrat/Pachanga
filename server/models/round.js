const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * Una jornada de una liga: el grupo de partidos y preguntas que se juega junto.
 *
 * Sustituye a la «semana» que se calculaba a partir de la fecha de cada partido,
 * de jueves a miércoles. Ahora el admin decide a qué jornada va cada partido, y una
 * jornada tiene fase (fase regular, suiza, playoffs…) y orden propios.
 *
 * `order` es el número que usan las estadísticas y la clasificación por jornada
 * (las columnas `week` de PlayerWeekStat, MatchStat, Question y LeagueParticipation).
 * En las ligas de antes de las jornadas es exactamente su número de semana de
 * entonces, así que nada de lo ya guardado cambia de sitio. Puede tener huecos: las
 * semanas sin partidos no generaron jornada.
 *
 * No guarda estado: «programada», «en juego» y «resuelta» se calculan a partir de
 * sus partidos y preguntas (utils/rounds.js), así que nunca pueden desfasarse.
 *
 * Por ahora las jornadas no tienen hora de cierre: se puede votar siempre.
 */
const Round = sequelize.define('Round', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    league_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'League',
            key: 'id'
        }
    },
    order: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // Ver STAGES en utils/rounds.js. Texto y no ENUM para poder añadir fases sin
    // migrar el tipo.
    stage: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'regular',
        validate: {
            isIn: [['regular', 'playin', 'swiss', 'playoffs', 'quarterfinal', 'semifinal', 'final']]
        }
    },
    // Vacío = se genera a partir de la fase y la posición («Jornada 3», «Ronda suiza 2»).
    name: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'Round',
    timestamps: false,
    underscored: true,
    indexes: [
        { unique: true, fields: ['league_id', 'order'] }
    ]
});

module.exports = Round;
