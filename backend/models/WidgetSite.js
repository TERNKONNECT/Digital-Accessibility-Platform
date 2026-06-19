const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WidgetSite = sequelize.define("WidgetSite", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  websiteName: { type: DataTypes.STRING, allowNull: false },
  websiteUrl: { type: DataTypes.STRING, allowNull: false },
  widgetId: { type: DataTypes.STRING, allowNull: false, unique: true },
  integrationCode: { type: DataTypes.STRING, allowNull: false, unique: true },
  embedScript: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM("pending", "active", "inactive"), allowNull: false, defaultValue: "pending" },
  firstSeenAt: { type: DataTypes.DATE, allowNull: true },
  lastActiveAt: { type: DataTypes.DATE, allowNull: true },
  widgetLoads: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  usageCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  dailyUsage: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  weeklyUsage: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  monthlyUsage: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});

module.exports = WidgetSite;
