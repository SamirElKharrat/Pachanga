'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('League', 'rules', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('League', 'leaguepedia_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('League', 'stats_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('League', 'rules');
    await queryInterface.removeColumn('League', 'leaguepedia_url');
    await queryInterface.removeColumn('League', 'stats_url');
  }
};
