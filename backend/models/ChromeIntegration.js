const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ChromeIntegration = sequelize.define("ChromeIntegration", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  integrationCode: { type: DataTypes.STRING, allowNull: false, unique: true },
  status: { type: DataTypes.ENUM("active", "inactive"), allowNull: false, defaultValue: "inactive" },
  lastActivityAt: { type: DataTypes.DATE, allowNull: true },
  isInternal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
});

module.exports = ChromeIntegration;
