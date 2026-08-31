const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * What one person answered to one question.
 *
 * Answers are final. That is enforced by the unique index below plus a controller
 * that refuses to update one — not by a disabled button, which only stops the people
 * who are not looking.
 *
 * `points` plays exactly the same role as `Prediction.points`: it is the memory of
 * what this answer was worth last time the aggregator ran, and the aggregator moves
 * the standings by the difference between that and what it is worth now. Without it,
 * correcting a wrongly marked answer would add points instead of moving them.
 */
const QuestionAnswer = sequelize.define('QuestionAnswer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Question',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'id'
        }
    },
    // The chosen option, stored as its text. Same reasoning as Question.correct_option:
    // comparing text to text means the two can never drift out of step.
    answer: {
        type: DataTypes.STRING,
        allowNull: false
    },
    points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'QuestionAnswer',
    timestamps: false,
    underscored: true,
    indexes: [
        // One answer per person per question. This is the rule "you cannot change
        // your answer", living where it cannot be worked around.
        {
            unique: true,
            fields: ['question_id', 'user_id']
        },
        // The Inicio asks for everyone's answers to a whole week at once.
        {
            fields: ['user_id']
        }
    ]
});

module.exports = QuestionAnswer;
