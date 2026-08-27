'use strict';

/** @type {import('sequelize-cli').Migration} */
// Two columns that came out of freezing the historical standings:
//
//   PlayerWeekStat.plenos          how many runs reached 3+ that week. It used to be
//                                  approximated at roll-up time as "the week's best
//                                  run was 3 or more", which undercounts a week with
//                                  two separate runs.
//
//   PlayerLeagueStat.points_official  what /clasificacion shows. For anything played
//                                  from the delta fix onwards it equals `points`; for
//                                  the leagues played before it, the standings keep
//                                  their old drift on purpose, and the stats screens
//                                  show this column so they never contradict them.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('PlayerWeekStat', 'plenos', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('PlayerLeagueStat', 'points_official', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('PlayerLeagueStat', 'points_official');
    await queryInterface.removeColumn('PlayerWeekStat', 'plenos');
  },
};
