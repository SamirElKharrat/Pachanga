'use strict';

/** @type {import('sequelize-cli').Migration} */
//
// Las novedades de la web, editables desde el panel.
//
// Una fila es un cambio suelto; la versión es la etiqueta que los agrupa y se
// repite. La versión que enseña la web sale de la entrada más reciente, así que no
// hay ningún sitio aparte donde apuntarla que pueda quedarse desfasado.
//
// Se siembra la 1.4 —lo que acaba de entrar— para que la ventana no salga vacía el
// primer día. Lo anterior a la 1.4 no se inventa: el proyecto no llevaba control de
// versiones y no hay de dónde sacarlo con honradez; se añade a mano desde el panel
// si algún día interesa.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Changelog', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      version: { type: Sequelize.STRING, allowNull: false },
      release_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      kind: {
        type: Sequelize.ENUM('new', 'change', 'fix'),
        allowNull: false,
        defaultValue: 'new',
      },
      text: { type: Sequelize.TEXT, allowNull: false },
    });

    await queryInterface.addIndex('Changelog', ['release_date'], { name: 'changelog_release_date' });

    const fecha = new Date();
    await queryInterface.bulkInsert('Changelog', [
      { version: '1.4', release_date: fecha, kind: 'new', text: 'Preguntas de la semana: dos por jornada, 4 puntos cada acierto.' },
      { version: '1.4', release_date: fecha, kind: 'new', text: 'Las respuestas se envían junto a las predicciones, en un solo envío, y no se pueden cambiar.' },
      { version: '1.4', release_date: fecha, kind: 'new', text: 'En el Inicio se ve qué ha respondido cada uno, con los mismos colores de acierto y fallo que los partidos.' },
      { version: '1.4', release_date: fecha, kind: 'new', text: 'Las estadísticas separan los puntos de preguntas del resto.' },
      { version: '1.4', release_date: fecha, kind: 'new', text: 'Esta ventana: versión y novedades dentro de Opciones.' },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Changelog');
    // El ENUM sobrevive al DROP TABLE en Postgres y bloquearía volver a migrar.
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Changelog_kind"');
  },
};
