'use strict';

/** @type {import('sequelize-cli').Migration} */
//
// Las jornadas: la tabla Round y `round_id` en Match y en Question.
//
// No rellena nada: eso lo hace el servidor al arrancar (utils/rounds.js,
// backfillRounds), que le pone a cada partido y pregunta la jornada de su semana de
// siempre. server.js también crea la tabla y las columnas si esta migración no se ha
// lanzado (ensureRoundColumns); las dos cosas son compatibles.
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('Round')) {
      await queryInterface.createTable('Round', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        league_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'League', key: 'id' } },
        order: { type: Sequelize.INTEGER, allowNull: false },
        stage: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'regular' },
        name: { type: Sequelize.STRING, allowNull: true },
      });
      await queryInterface.addIndex('Round', ['league_id', 'order'], { unique: true, name: 'round_league_id_order' });
    }

    for (const table of ['Match', 'Question']) {
      const described = await queryInterface.describeTable(table);
      if (described.round_id) continue;
      await queryInterface.addColumn(table, 'round_id', {
        type: Sequelize.INTEGER, allowNull: true, references: { model: 'Round', key: 'id' },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Question', 'round_id');
    await queryInterface.removeColumn('Match', 'round_id');
    await queryInterface.dropTable('Round');
  },
};
