const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SystemSetting = sequelize.define("SystemSetting", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  adminMaxChromeProfiles: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 9999 },
  adminMaxWebsites: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 9999 },
  defaultTrialDurationMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
  defaultTrialSessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 }
});

module.exports = SystemSetting;
