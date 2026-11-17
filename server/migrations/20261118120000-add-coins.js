'use strict';

/** @type {import('sequelize-cli').Migration} */
//
// Monedas (fase 1 de cartas y cofres): el libro de movimientos CoinTransaction.
//
// server.js también crea la tabla al arrancar (`db.sync` crea las tablas nuevas), así
// que las dos cosas son compatibles: si la tabla ya existe, esto no hace nada.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('CoinTransaction')) return;

    await queryInterface.createTable('CoinTransaction', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'User', key: 'id' }, onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      reason: { type: Sequelize.STRING(32), allowNull: false },
      ref_type: { type: Sequelize.STRING(16), allowNull: true },
      ref_id: { type: Sequelize.STRING(64), allowNull: true },
      league_id: { type: Sequelize.INTEGER, allowNull: true },
      reverses_id: { type: Sequelize.INTEGER, allowNull: true },
      note: { type: Sequelize.STRING, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('CoinTransaction', ['user_id']);
    await queryInterface.addIndex('CoinTransaction', ['user_id', 'reason', 'ref_type', 'ref_id']);
    await queryInterface.addIndex('CoinTransaction', ['reverses_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('CoinTransaction');
  },
};
