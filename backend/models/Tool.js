const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Tool = sequelize.define("Tool", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  type: { type: DataTypes.STRING, allowNull: false }, // e.g., 'extension', 'widget'
  allowedRoles: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
});

module.exports = Tool;
