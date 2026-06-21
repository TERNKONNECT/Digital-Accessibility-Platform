const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ChromeProfileActivity = sequelize.define("ChromeProfileActivity", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  chromeProfileId: { type: DataTypes.UUID, allowNull: false },
  actionType: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
});

module.exports = ChromeProfileActivity;
