const sequelize = require("../config/database");

const User = require("./User");
const Organization = require("./Organization");
const IntegrationPin = require("./IntegrationPin");
const Subscription = require("./Subscription");
const Tool = require("./Tool");
const UsageLog = require("./UsageLog");

// Associations
User.belongsTo(Organization, { foreignKey: "organizationId", as: "organization" });
Organization.hasMany(User, { foreignKey: "organizationId", as: "users" });

User.belongsTo(Subscription, { foreignKey: "subscriptionId", as: "subscription" });
Organization.belongsTo(Subscription, { foreignKey: "subscriptionId", as: "subscription" });

IntegrationPin.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(IntegrationPin, { foreignKey: "userId", as: "pins" });

IntegrationPin.belongsTo(Organization, { foreignKey: "organizationId", as: "organization" });
Organization.hasMany(IntegrationPin, { foreignKey: "organizationId", as: "pins" });

UsageLog.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(UsageLog, { foreignKey: "userId", as: "usageLogs" });

UsageLog.belongsTo(Organization, { foreignKey: "organizationId", as: "organization" });
Organization.hasMany(UsageLog, { foreignKey: "organizationId", as: "usageLogs" });

UsageLog.belongsTo(Tool, { foreignKey: "toolId", as: "tool" });
Tool.hasMany(UsageLog, { foreignKey: "toolId", as: "usageLogs" });

module.exports = {
  sequelize,
  User,
  Organization,
  IntegrationPin,
  Subscription,
  Tool,
  UsageLog,
};
