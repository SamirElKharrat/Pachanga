const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'pachanga',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'samir123',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
    }
);

module.exports = sequelize;
