'use strict';

/** @type {import('sequelize-cli').Migration} */
//
// Cartas (fase 2 de cartas y cofres): las tablas UserCard y CardPlay, el interruptor
// League.cards_enabled y la columna points_card de las estadísticas.
//
// server.js también lo crea todo al arrancar (las tablas con `db.sync`, las columnas
// con ensureCardColumns), así que las dos cosas son compatibles.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('UserCard')) {
      await queryInterface.createTable('UserCard', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'User', key: 'id' }, onDelete: 'CASCADE' },
        league_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'League', key: 'id' }, onDelete: 'CASCADE' },
        card: { type: Sequelize.STRING(16), allowNull: false },
        status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'in_hand' },
        source: { type: Sequelize.STRING(16), allowNull: false },
        source_ref: { type: Sequelize.STRING(64), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      });
      await queryInterface.addIndex('UserCard', ['user_id', 'league_id', 'status']);
      await queryInterface.addIndex('UserCard', ['user_id', 'league_id', 'source', 'source_ref']);
    }

    if (!tables.includes('CardPlay')) {
      await queryInterface.createTable('CardPlay', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        user_card_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'UserCard', key: 'id' }, onDelete: 'CASCADE' },
        user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'User', key: 'id' }, onDelete: 'CASCADE' },
        league_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'League', key: 'id' }, onDelete: 'CASCADE' },
        round_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Round', key: 'id' }, onDelete: 'CASCADE' },
        card: { type: Sequelize.STRING(16), allowNull: false },
        match_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Match', key: 'id' }, onDelete: 'CASCADE' },
        target_user_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'User', key: 'id' }, onDelete: 'CASCADE' },
        status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'active' },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      });
      await queryInterface.addIndex('CardPlay', ['user_card_id'], { unique: true });
      await queryInterface.addIndex('CardPlay', ['league_id', 'round_id']);
      await queryInterface.addIndex('CardPlay', ['target_user_id', 'round_id']);
    }

    const league = await queryInterface.describeTable('League');
    if (!league.cards_enabled) {
      await queryInterface.addColumn('League', 'cards_enabled', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    }
    for (const table of ['PlayerWeekStat', 'PlayerLeagueStat']) {
      const described = await queryInterface.describeTable(table);
      if (!described.points_card) {
        await queryInterface.addColumn(table, 'points_card', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('CardPlay');
    await queryInterface.dropTable('UserCard');
    await queryInterface.removeColumn('League', 'cards_enabled');
    await queryInterface.removeColumn('PlayerWeekStat', 'points_card');
    await queryInterface.removeColumn('PlayerLeagueStat', 'points_card');
  },
};
