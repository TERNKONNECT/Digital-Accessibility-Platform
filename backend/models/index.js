const sequelize = require("../config/database");

const User = require("./User");
const Organization = require("./Organization");
const IntegrationPin = require("./IntegrationPin");
const Subscription = require("./Subscription");
const SubscriptionPlan = require("./SubscriptionPlan");
const Tool = require("./Tool");
const UsageLog = require("./UsageLog");
const ChromeIntegration = require("./ChromeIntegration");
const ChromeProfile = require("./ChromeProfile");
const WidgetSite = require("./WidgetSite");
const PaymentHistory = require("./PaymentHistory");
const ActivityLog = require("./ActivityLog");

// Associations
User.belongsTo(Organization, { foreignKey: "organizationId", as: "organization" });
Organization.hasMany(User, { foreignKey: "organizationId", as: "users" });

User.belongsTo(Subscription, { foreignKey: "subscriptionId", as: "subscription" });
Organization.belongsTo(Subscription, { foreignKey: "subscriptionId", as: "subscription" });
Subscription.belongsTo(SubscriptionPlan, { foreignKey: "planId", as: "planDetails" });
SubscriptionPlan.hasMany(Subscription, { foreignKey: "planId", as: "subscriptions" });

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

ChromeIntegration.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasOne(ChromeIntegration, { foreignKey: "userId", as: "chromeIntegration" });

ChromeProfile.belongsTo(ChromeIntegration, { foreignKey: "chromeIntegrationId", as: "integration" });
ChromeIntegration.hasMany(ChromeProfile, { foreignKey: "chromeIntegrationId", as: "profiles" });
ChromeProfile.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(ChromeProfile, { foreignKey: "userId", as: "chromeProfiles" });

WidgetSite.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(WidgetSite, { foreignKey: "userId", as: "widgetSites" });

PaymentHistory.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(PaymentHistory, { foreignKey: "userId", as: "payments" });

ActivityLog.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(ActivityLog, { foreignKey: "userId", as: "activityLogs" });

module.exports = {
  sequelize,
  User,
  Organization,
  IntegrationPin,
  Subscription,
  SubscriptionPlan,
  Tool,
  UsageLog,
  ChromeIntegration,
  ChromeProfile,
  WidgetSite,
  PaymentHistory,
  ActivityLog,
};
