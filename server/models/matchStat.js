const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * Aggregated numbers for a single resolved match: how the group voted and how it
 * went. Feeds the "moments" of a league (the most divided match, the upset, the
 * unanimous one).
 *
 * Written by utils/statsAggregator.js whenever a result is created, changed or
 * deleted. Never edited by hand.
 */
const MatchStat = sequelize.define('MatchStat', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    match_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Match',
            key: 'id'
        }
    },
    league_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'League',
            key: 'id'
        }
    },
    // League week the match belongs to, same numbering as LeagueParticipation.
    week: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    predictions_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // How many got the winner right.
    correct_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // How many also nailed the scoreline.
    exact_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // Share of votes taken by the most-voted team, 0..1. The closer to 0.5, the more
    // the group was split — this is what ranks "the most divided match".
    top_vote_share: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    computed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'MatchStat',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['match_id']
        },
        {
            fields: ['league_id']
        }
    ]
});

module.exports = MatchStat;
