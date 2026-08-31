const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * A question put to everyone for one week of one league.
 *
 * There is no bank and no draw: an admin writes the week's questions by hand, two
 * of them, and that is the whole story. A question belongs to the week it was
 * written for and is never reused.
 *
 * The correct answer lives here too, and it is what separates an open question from
 * a settled one. While `correct_option` is null nobody has scored anything; filling
 * it in is what pays the points out, the same way entering a result pays out a
 * match. See utils/statsAggregator.js.
 */
const Question = sequelize.define('Question', {
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
    // Same week numbering as LeagueParticipation and PlayerWeekStat: 1-based from
    // the Thursday the league starts on. Everything in the project counts weeks this
    // way — see controllers/weekController.js — and the questions have to agree with
    // it or their points land in the wrong week.
    week: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    // What you can answer, as a list of strings: ["Sí", "No"], ["G2", "FNC", …].
    // Stored as JSONB rather than a second table because nothing ever queries an
    // option on its own — they are only ever read as the whole list of one question.
    options: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
    },
    // Null until the week closes. It holds the option text itself, not an index, so
    // reordering or fixing a typo in `options` can never silently change which answer
    // was the right one.
    correct_option: {
        type: DataTypes.STRING,
        allowNull: true
    },
    closed_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'Question',
    timestamps: false,
    underscored: true,
    indexes: [
        // The query the site makes every time someone opens a week. Deliberately not
        // unique: two questions a week is the plan, not a constraint, and a week with
        // one or three has to keep working.
        {
            fields: ['league_id', 'week']
        }
    ]
});

module.exports = Question;
