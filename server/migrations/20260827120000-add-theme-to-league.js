'use strict';

/** @type {import('sequelize-cli').Migration} */
//
// League.theme — qué piel lleva la web mientras esa competición está viva.
//
//   'default'  la web de siempre
//   'worlds'   el tema del mundial
//
// Es el único campo que se añade en todo el proyecto del modo Worlds. La idea es
// que se marque una vez al crear la liga y no se vuelva a tocar: a partir de ahí
// manda el estado, que ya se mueve solo con las fechas de inicio y fin.
//
// Se guarda como texto y no como ENUM a propósito. Un ENUM en Postgres obliga a
// una migración cada vez que se quiera añadir un tema, y la idea es justamente que
// añadir el de otro año salga barato.
//
// El backfill usa el mismo criterio que ya usaba `counts_for_pachanga` en
// server.js (nombre que contenga «worlds» o «mundial»), así que no inventa nada
// nuevo. Marcar una liga vieja no tiene efecto: la regla exige además que no esté
// terminada y que no se haya pasado su fecha de fin.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('League', 'theme', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'default',
    });

    await queryInterface.sequelize.query(
      `UPDATE "League" SET theme = 'worlds'
        WHERE name ILIKE '%worlds%' OR name ILIKE '%mundial%'`
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('League', 'theme');
  },
};
