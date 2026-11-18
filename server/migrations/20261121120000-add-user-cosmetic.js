'use strict';

/** @type {import('sequelize-cli').Migration} */
//
// Tienda y cosméticos (fase 3 de cartas y cofres): la tabla UserCosmetic.
//
// server.js también la crea al arrancar (`db.sync`), así que las dos cosas son
// compatibles.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('UserCosmetic')) return;
    await queryInterface.createTable('UserCosmetic', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'User', key: 'id' }, onDelete: 'CASCADE' },
      item_id: { type: Sequelize.STRING(32), allowNull: false },
      equipped: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      source: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'shop' },
      acquired_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('UserCosmetic', ['user_id', 'item_id'], { unique: true });
    await queryInterface.addIndex('UserCosmetic', ['equipped']);
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('UserCosmetic')) await queryInterface.dropTable('UserCosmetic');
  },
};
