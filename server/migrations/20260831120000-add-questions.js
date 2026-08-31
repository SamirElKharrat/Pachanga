'use strict';

/** @type {import('sequelize-cli').Migration} */
//
// Las preguntas de la jornada.
//
// Cada semana el administrador escribe dos preguntas de una liga, la gente las
// responde junto a sus predicciones, y al cerrar la semana se marca cuál era la
// correcta. Cada acierto vale 4 puntos.
//
// Dos tablas y no tres: no hay banco ni sorteo. Una pregunta se escribe para una
// jornada concreta y no se reutiliza, así que la pregunta y su aparición son la
// misma fila. Lo que sí necesita tabla propia son las respuestas, porque hay una
// por persona.
//
// La tercera cosa que se toca aquí es `points_question` en las dos tablas de
// estadísticas. No es un extra: sin ella, los puntos de preguntas acabarían
// contados como `points_manual` —que se mide como «todo lo que hay en la
// clasificación y las estadísticas no saben explicar»— y la web se los enseñaría
// al jugador como puntos añadidos a mano. Ver utils/statsAggregator.js.
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. La pregunta ───────────────────────────────────────────────────────
    await queryInterface.createTable('Question', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      league_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'League', key: 'id' }, onDelete: 'CASCADE',
      },
      // Misma numeración que LeagueParticipation y PlayerWeekStat: 1 desde el
      // jueves de inicio de liga.
      week: { type: Sequelize.INTEGER, allowNull: false },
      text: { type: Sequelize.TEXT, allowNull: false },
      // Las opciones, como lista de textos. JSONB y no una tabla aparte porque
      // nunca se consulta una opción suelta: se leen siempre todas juntas.
      options: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      // Null mientras la pregunta esté abierta. Guarda el texto de la opción, no su
      // posición, para que reordenar las opciones no cambie cuál era la buena.
      correct_option: { type: Sequelize.STRING, allowNull: true },
      closed_at: { type: Sequelize.DATE, allowNull: true },
    });

    // La consulta que hace la web al abrir una jornada. Sin unicidad a propósito:
    // dos preguntas por semana es el plan, no una restricción.
    await queryInterface.addIndex('Question', ['league_id', 'week'], { name: 'question_league_week' });

    // ── 2. La respuesta ──────────────────────────────────────────────────────
    await queryInterface.createTable('QuestionAnswer', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      question_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'Question', key: 'id' }, onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'User', key: 'id' }, onDelete: 'CASCADE',
      },
      answer: { type: Sequelize.STRING, allowNull: false },
      // Lo que valió la última vez que pasó el agregador. Mismo papel que
      // Prediction.points: es contra esto contra lo que se calculan las diferencias.
      points: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    // Una respuesta por persona y pregunta. Esto es «las respuestas no se pueden
    // cambiar», puesto donde no se puede esquivar.
    await queryInterface.addIndex('QuestionAnswer', ['question_id', 'user_id'], {
      unique: true, name: 'question_answer_unique',
    });
    await queryInterface.addIndex('QuestionAnswer', ['user_id'], { name: 'question_answer_user' });

    // ── 3. Los puntos de preguntas en las estadísticas ───────────────────────
    await queryInterface.addColumn('PlayerWeekStat', 'points_question', {
      type: Sequelize.INTEGER, allowNull: false, defaultValue: 0,
    });
    await queryInterface.addColumn('PlayerLeagueStat', 'points_question', {
      type: Sequelize.INTEGER, allowNull: false, defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('PlayerLeagueStat', 'points_question');
    await queryInterface.removeColumn('PlayerWeekStat', 'points_question');

    await queryInterface.dropTable('QuestionAnswer');
    await queryInterface.dropTable('Question');
  },
};
