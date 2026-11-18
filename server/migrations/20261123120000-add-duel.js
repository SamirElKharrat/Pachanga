'use strict';

/** @type {import('sequelize-cli').Migration} */
//
// Duelos (fase 6 de cartas y cofres): la tabla Duel y la columna `points_duel` en las
// estadísticas de jornada y de liga.
//
// server.js también crea la tabla (`db.sync`) y las columnas (`ensureCardColumns`) al
// arrancar, así que las dos cosas son compatibles.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('Duel')) {
      await queryInterface.createTable('Duel', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        league_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'League', key: 'id' }, onDelete: 'CASCADE' },
        round_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Round', key: 'id' }, onDelete: 'CASCADE' },
        challenger_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'User', key: 'id' }, onDelete: 'CASCADE' },
        rival_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'User', key: 'id' }, onDelete: 'CASCADE' },
        stake_kind: { type: Sequelize.STRING(8), allowNull: false },
        stake: { type: Sequelize.INTEGER, allowNull: false },
        status: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'pending' },
        winner_id: { type: Sequelize.INTEGER, allowNull: true },
        challenger_seen: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        responded_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      });
      await queryInterface.addIndex('Duel', ['round_id', 'status']);
      await queryInterface.addIndex('Duel', ['challenger_id']);
      await queryInterface.addIndex('Duel', ['rival_id']);
    }
    for (const table of ['PlayerWeekStat', 'PlayerLeagueStat']) {
      const columns = await queryInterface.describeTable(table);
      if (!columns.points_duel) {
        await queryInterface.addColumn(table, 'points_duel', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
      }
    }
  },

  async down(queryInterface) {
    for (const table of ['PlayerWeekStat', 'PlayerLeagueStat']) {
      const columns = await queryInterface.describeTable(table);
      if (columns.points_duel) await queryInterface.removeColumn(table, 'points_duel');
    }
    const tables = await queryInterface.showAllTables();
    if (tables.includes('Duel')) await queryInterface.dropTable('Duel');
  },
};
