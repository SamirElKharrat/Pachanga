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

    const existingUsers = await queryInterface.sequelize.query(
      'SELECT id FROM "User" LIMIT 1',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (existingUsers && existingUsers.length > 0) {
      console.log('Ya existen usuarios en la base de datos, omitiendo seeder');
      return;
    }
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

    const [adminRole, userRole] = await Promise.all([
      Role.findOne({ where: { name: 'admin' } }),
      Role.findOne({ where: { name: 'user' } })
    ]);

    const adminUser = await User.findOne({
      where: { email: 'admin@pachanga.com' }
    });

    if (adminUser && adminRole) {
      await adminUser.addRole(adminRole);
    }

    const otherUsers = await User.findAll({
      where: {
        email: { [Sequelize.Op.ne]: 'admin@pachanga.com' }
      }
    });
    for (const user of otherUsers) {
      await user.addRole(userRole);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('User', null, {});
  }
};
