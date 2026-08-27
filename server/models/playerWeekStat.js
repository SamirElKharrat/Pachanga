const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * What one player did in one week of one league.
 *
 * This is the finest grain the stats keep, and the unit the aggregator rewrites:
 * a pleno chains matches inside a week, so a week is the smallest thing that can be
 * recomputed correctly on its own. PlayerLeagueStat is just the sum of these.
 *
 * Written by utils/statsAggregator.js. Never edited by hand.
 */
const PlayerWeekStat = sequelize.define('PlayerWeekStat', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
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
    // Same week numbering as LeagueParticipation (1-based, from the league start).
    week: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // Matches of this week that had a result: the denominator for participation.
    matches_available: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    predictions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // Winner guessed right.
    wins: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // Winner and scoreline both right.
    exact_scores: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // Longest chain of consecutive exact scores inside this week.
    best_run: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // How many runs reached 3 or more this week, i.e. how many plenos were scored.
    plenos: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // Same total, split by where it came from. points = the sum of these four.
    points_base: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    points_exact: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    points_streak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    points_favorite: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    computed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'PlayerWeekStat',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'league_id', 'week']
        },
        {
            fields: ['league_id', 'week']
        }
    ]
});

module.exports = PlayerWeekStat;
