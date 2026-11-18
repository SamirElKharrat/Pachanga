'use strict';

/** @type {import('sequelize-cli').Migration} */
//
// Cofres de competición (fase 4 de cartas y cofres): la tabla ChestOpen.
//
// server.js también la crea al arrancar (`db.sync`), así que las dos cosas son
// compatibles.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('ChestOpen')) return;
    await queryInterface.createTable('ChestOpen', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'User', key: 'id' }, onDelete: 'CASCADE' },
      league_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'League', key: 'id' }, onDelete: 'CASCADE' },
      cost: { type: Sequelize.INTEGER, allowNull: false },
      rarity: { type: Sequelize.STRING(8), allowNull: false },
      guaranteed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      prize_kind: { type: Sequelize.STRING(12), allowNull: false },
      prize_id: { type: Sequelize.STRING(32), allowNull: true },
      coins: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      converted: { type: Sequelize.STRING(12), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('ChestOpen', ['user_id', 'created_at']);
    await queryInterface.addIndex('ChestOpen', ['user_id', 'league_id', 'id']);
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('ChestOpen')) await queryInterface.dropTable('ChestOpen');
  },
};
