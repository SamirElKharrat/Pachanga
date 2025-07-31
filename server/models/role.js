const { DataTypes } = require('sequelize');
const sequelize = require('../config/configdb');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  }
}, {
  tableName: 'Role',
  timestamps: false,
  underscored: true
});

module.exports = Role;