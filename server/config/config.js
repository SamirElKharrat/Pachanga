require('dotenv').config();

module.exports = {
  development: {
    username: 'postgres',
    password: 'samir123',
    database: 'pachanga',
    host: 'localhost',
    dialect: 'postgres',
    logging: console.log
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres'
  }
};