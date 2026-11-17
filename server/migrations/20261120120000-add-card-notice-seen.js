'use strict';

/**
 * CardPlay.target_seen: hasta dónde ha visto quien recibe un Gafe el aviso a pantalla
 * completa (null, 'pending' o 'resolved'). Idempotente: el servidor también la crea
 * al arrancar si falta.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('CardPlay');
        if (!table.target_seen) {
            await queryInterface.addColumn('CardPlay', 'target_seen', { type: Sequelize.STRING(16), allowNull: true });
        }
    },

    async down(queryInterface) {
        const table = await queryInterface.describeTable('CardPlay');
        if (table.target_seen) await queryInterface.removeColumn('CardPlay', 'target_seen');
    },
};
