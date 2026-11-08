'use strict';

/** @type {import('sequelize-cli').Migration} */
//
// Preguntas de texto libre, y las preguntas en las estadísticas.
//
// - Question.answer_type: 'choice' (como hasta ahora) o 'text'.
// - Question.accepted_answers: las respuestas de texto que el admin da por buenas.
// - PlayerWeekStat / PlayerLeagueStat: cuántas preguntas hubo, se respondieron y se
//   acertaron, contadas aparte de los partidos.
//
// server.js hace lo mismo al arrancar (ensureQuestionColumns) por si el código llega
// antes que la migración; las dos cosas son compatibles entre sí.
const STAT_TABLES = ['PlayerWeekStat', 'PlayerLeagueStat'];
const STAT_COLUMNS = ['questions_available', 'questions_answered', 'questions_correct'];

module.exports = {
  async up(queryInterface, Sequelize) {
    const question = await queryInterface.describeTable('Question');
    if (!question.answer_type) {
      await queryInterface.addColumn('Question', 'answer_type', {
        type: Sequelize.STRING(16), allowNull: false, defaultValue: 'choice',
      });
    }
    if (!question.accepted_answers) {
      await queryInterface.addColumn('Question', 'accepted_answers', {
        type: Sequelize.JSONB, allowNull: false, defaultValue: [],
      });
    }

    for (const table of STAT_TABLES) {
      const described = await queryInterface.describeTable(table);
      for (const column of STAT_COLUMNS) {
        if (described[column]) continue;
        await queryInterface.addColumn(table, column, {
          type: Sequelize.INTEGER, allowNull: false, defaultValue: 0,
        });
      }
    }

    // `closed_at` pasa a ser la señal de «corregida».
    await queryInterface.sequelize.query(
      `UPDATE "Question" SET closed_at = NOW() WHERE correct_option IS NOT NULL AND closed_at IS NULL`
    );
  },

  async down(queryInterface) {
    for (const table of STAT_TABLES) {
      for (const column of STAT_COLUMNS) {
        await queryInterface.removeColumn(table, column);
      }
    }
    await queryInterface.removeColumn('Question', 'accepted_answers');
    await queryInterface.removeColumn('Question', 'answer_type');
  },
};
