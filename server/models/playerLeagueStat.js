const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

/**
 * What one player did across a whole league. The sum of their PlayerWeekStat rows,
 * plus the things that only make sense at league level (final rank, and the bonus
 * for where their favourite team finished).
 *
 * This is what almost every stats screen reads. Written by
 * utils/statsAggregator.js; never edited by hand.
 */
const PlayerLeagueStat = sequelize.define('PlayerLeagueStat', {
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
    // Denormalised from the league start date so the season filter is one indexed
    // column instead of a join.
    year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // Matches of the league with a result. Denominator of participation.
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
    wins: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    exact_scores: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // Longest chain of consecutive exact scores. Plenos never cross a week, so this
    // is the best week's run, not a run across the whole league.
    best_run: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // How many times a run reached 3 or more, i.e. how many plenos they scored.
    plenos: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // Points from predictions. Deliberately the same thing LeagueParticipation
    // tracks, so the two can always be compared against each other.
    points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
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
    // Whatever the standings hold on top of what the predictions add up to under
    // today's rules. Measured as `points_official - points`, so the two always
    // reconcile whatever went in there. For the frozen leagues it covers the
    // end-of-league points added by hand for a favourite team's finish, plus what the
    // old pleno rule overpaid before it was corrected. Signed: it goes negative where
    // a corrected result left the stored prediction points stale.
    points_manual: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // What /clasificacion shows for this player. From the delta fix onwards it always
    // equals `points`; for the leagues played before it, it can differ, and those are
    // frozen on purpose. The stats screens show this one so they never contradict the
    // standings.
    points_official: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    // Position in this league by points, 1-based.
    rank: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    computed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'PlayerLeagueStat',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'league_id']
        },
        {
            fields: ['league_id']
        },
        {
            fields: ['year']
        }
    ]
});

module.exports = PlayerLeagueStat;
