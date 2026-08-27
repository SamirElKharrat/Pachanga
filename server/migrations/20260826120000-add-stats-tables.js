'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. Which competitions add up to the Pachanga season ──────────────────
    await queryInterface.addColumn('League', 'counts_for_pachanga', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // Worlds has its own prizes and does not score for the Pachanga.
    await queryInterface.sequelize.query(
      `UPDATE "League" SET counts_for_pachanga = false WHERE name ILIKE '%worlds%' OR name ILIKE '%mundial%'`
    );

    // ── 2. Final team standings, filled in by an admin when a league ends ────
    await queryInterface.createTable('LeagueStanding', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      league_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'League', key: 'id' }, onDelete: 'CASCADE',
      },
      team_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Team', key: 'id' }, onDelete: 'CASCADE',
      },
      position: { type: Sequelize.INTEGER, allowNull: false },
    });
    await queryInterface.addIndex('LeagueStanding', ['league_id', 'team_id'], {
      unique: true, name: 'league_standing_league_team_unique',
    });
    await queryInterface.addIndex('LeagueStanding', ['league_id'], { name: 'league_standing_league' });

    // ── 3. Per-match aggregates ──────────────────────────────────────────────
    await queryInterface.createTable('MatchStat', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      match_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Match', key: 'id' }, onDelete: 'CASCADE',
      },
      league_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'League', key: 'id' }, onDelete: 'CASCADE',
      },
      week: { type: Sequelize.INTEGER, allowNull: false },
      predictions_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      correct_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      exact_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      top_vote_share: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      computed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('MatchStat', ['match_id'], {
      unique: true, name: 'match_stat_match_unique',
    });
    await queryInterface.addIndex('MatchStat', ['league_id'], { name: 'match_stat_league' });

    // ── 4. Per player, per league, per week ──────────────────────────────────
    await queryInterface.createTable('PlayerWeekStat', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'User', key: 'id' }, onDelete: 'CASCADE',
      },
      league_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'League', key: 'id' }, onDelete: 'CASCADE',
      },
      week: { type: Sequelize.INTEGER, allowNull: false },
      matches_available: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      predictions: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      wins: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      exact_scores: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      best_run: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      points: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      points_base: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      points_exact: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      points_streak: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      points_favorite: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      computed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('PlayerWeekStat', ['user_id', 'league_id', 'week'], {
      unique: true, name: 'player_week_stat_unique',
    });
    await queryInterface.addIndex('PlayerWeekStat', ['league_id', 'week'], { name: 'player_week_stat_league_week' });

    // ── 5. Per player, per league ────────────────────────────────────────────
    await queryInterface.createTable('PlayerLeagueStat', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'User', key: 'id' }, onDelete: 'CASCADE',
      },
      league_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'League', key: 'id' }, onDelete: 'CASCADE',
      },
      year: { type: Sequelize.INTEGER, allowNull: false },
      matches_available: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      predictions: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      wins: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      exact_scores: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      best_run: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      plenos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      points: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      points_base: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      points_exact: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      points_streak: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      points_favorite: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      points_team_placement: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      rank: { type: Sequelize.INTEGER, allowNull: true },
      computed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('PlayerLeagueStat', ['user_id', 'league_id'], {
      unique: true, name: 'player_league_stat_unique',
    });
    await queryInterface.addIndex('PlayerLeagueStat', ['league_id'], { name: 'player_league_stat_league' });
    await queryInterface.addIndex('PlayerLeagueStat', ['year'], { name: 'player_league_stat_year' });

    // ── 6. Indexes the existing tables were missing ──────────────────────────
    // Every stats read walks predictions by match or by user, and matches by
    // league and date. None of these were indexed.
    await queryInterface.addIndex('Prediction', ['match_id'], { name: 'prediction_match' });
    await queryInterface.addIndex('Prediction', ['user_id', 'match_id'], { name: 'prediction_user_match' });
    await queryInterface.addIndex('Match', ['league_id', 'date'], { name: 'match_league_date' });
    await queryInterface.addIndex('Result', ['match_id'], { name: 'result_match' });
    await queryInterface.addIndex('LeagueParticipation', ['league_id', 'week'], { name: 'league_participation_league_week' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('LeagueParticipation', 'league_participation_league_week');
    await queryInterface.removeIndex('Result', 'result_match');
    await queryInterface.removeIndex('Match', 'match_league_date');
    await queryInterface.removeIndex('Prediction', 'prediction_user_match');
    await queryInterface.removeIndex('Prediction', 'prediction_match');

    await queryInterface.dropTable('PlayerLeagueStat');
    await queryInterface.dropTable('PlayerWeekStat');
    await queryInterface.dropTable('MatchStat');
    await queryInterface.dropTable('LeagueStanding');

    await queryInterface.removeColumn('League', 'counts_for_pachanga');
  },
};
