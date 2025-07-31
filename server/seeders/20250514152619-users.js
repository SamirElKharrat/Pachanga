'use strict';
const Role = require('../models/role');
const User = require('../models/user');
const bcrypt = require('bcryptjs');

User.belongsToMany(Role, { through: 'UserRoles' });
Role.belongsToMany(User, { through: 'UserRoles' });


/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPass = await bcrypt.hash("pachanga123!", 10);
    await queryInterface.bulkInsert('User', [
      {
        username: 'Admin',
        email: 'admin@pachanga.com',
        password: hashedPass,
      },
      {
        username: 'Samir',
        email: 'samir@pachanga.com',
        password: hashedPass,
      },
      {
        username: 'Karim',
        email: 'karim@pachanga.com',
        password: hashedPass,
      },
      {
        username: 'Javi',
        email: 'javi@pachanga.com',
        password: hashedPass,
      },
      {
        username: 'Tensi',
        email: 'tensi@pachanga.com',
        password: hashedPass,
      },
      {
        username: 'Guillermo',
        email: 'guillermo@pachanga.com',
        password: hashedPass,
      },
      {
        username: 'Aridane',
        email: 'aridane@pachanga.com',
        password: hashedPass,
      },
      {
        username: 'Fabri',
        email: 'fabri@pachanga.com',
        password: hashedPass,
      },
      {
        username: 'Isaias',
        email: 'isaias@pachanga.com',
        password: hashedPass,
      },
      {
        username: 'Daniel',
        email: 'daniel@pachanga.com',
        password: hashedPass,
      },
    ]);
    const adminRole = await Role.findByPk(1);
    const userRole = await Role.findByPk(2);
    const adminUser = await User.findByPk(1);

    await adminUser.addRole(adminRole);

    const users = await User.findAll({
      where: {
        id: {
          [Sequelize.Op.not]: 1,
        },
      },
    });

    for (const user of users) {
      await user.addRole(userRole);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('User', null, {});
  }
};
