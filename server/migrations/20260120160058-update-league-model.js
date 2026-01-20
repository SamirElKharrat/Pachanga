'use strict';

/** @type {import('sequelize-cli').Migration} */
// migrations/xxxxxxxx-update-league-model.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('League', 'status', {
      type: Sequelize.ENUM('scheduled', 'live', 'finished'),
      defaultValue: 'scheduled'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('League', 'status');
  }
};
