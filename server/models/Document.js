const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const Document = sequelize.define('Document', {
    name: DataTypes.STRING,
    url: DataTypes.STRING,
    mimetype: DataTypes.STRING,
    size: DataTypes.INTEGER,
});

module.exports = Document;
