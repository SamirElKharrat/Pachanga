'use strict';

/** @type {import('sequelize-cli').Migration} */
// La clasificación final de equipos se retira: los puntos por dónde acabó tu equipo
// favorito se siguen metiendo a mano en la clasificación al cerrar cada liga, así que
// una tabla que los derivara solo serviría para duplicarlos.
//
// A cambio, `points_team_placement` pasa a llamarse `points_manual` y deja de
// calcularse: es la diferencia entre lo que muestra la clasificación y lo que suman
// las predicciones. O sea, exactamente lo que se añadió a mano.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn('PlayerLeagueStat', 'points_team_placement', 'points_manual');
    await queryInterface.dropTable('LeagueStanding');
  },

  async down(queryInterface, Sequelize) {
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

    await queryInterface.renameColumn('PlayerLeagueStat', 'points_manual', 'points_team_placement');
  },
};
