const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SubscriptionPlan = sequelize.define("SubscriptionPlan", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "USD" },
  billingCycle: { type: DataTypes.ENUM("monthly", "yearly"), allowNull: false, defaultValue: "monthly" },
  chromeExtensionAccess: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  widgetAccess: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  maxChromeProfiles: { type: DataTypes.INTEGER, allowNull: true },
  maxWebsites: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM("active", "inactive"), allowNull: false, defaultValue: "active" },
});

module.exports = SubscriptionPlan;
