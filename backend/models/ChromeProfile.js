const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ChromeProfile = sequelize.define("ChromeProfile", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  profileName: { type: DataTypes.STRING, allowNull: false, defaultValue: "Chrome Profile" },
  profileId: { type: DataTypes.STRING, allowNull: false },
  chromeEmail: { type: DataTypes.STRING, allowNull: true },
  browserVersion: { type: DataTypes.STRING, allowNull: true },
  loginTime: { type: DataTypes.DATE, allowNull: true },
  logoutTime: { type: DataTypes.DATE, allowNull: true },
  firstSeenAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  lastActiveAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.ENUM("active", "inactive"), allowNull: false, defaultValue: "active" },
});

module.exports = ChromeProfile;
