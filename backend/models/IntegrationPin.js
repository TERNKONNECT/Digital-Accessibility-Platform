const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const IntegrationPin = sequelize.define("IntegrationPin", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  pin: { type: DataTypes.STRING, allowNull: false }, // Hashed
  toolId: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.ENUM("active", "revoked"), defaultValue: "active" },
});

module.exports = IntegrationPin;
