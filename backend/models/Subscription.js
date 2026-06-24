const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Subscription = sequelize.define("Subscription", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  plan: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM("active", "canceled", "expired"), defaultValue: "active" },
  targetEntity: { type: DataTypes.ENUM("user", "organization"), allowNull: false },
  limits: { type: DataTypes.JSON, defaultValue: {} }, // e.g. { tokens: 100000 }
  startsAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  endsAt: { type: DataTypes.DATE, allowNull: true },
  // Lifetime count of voice-assistant sessions started on the Starter
  // (default/free) plan. Enforced in POST /api/auth/session — 3 sessions of
  // 5 minutes each, then the user must upgrade. Irrelevant for paid plans.
  trialSessionsUsed: { type: DataTypes.INTEGER, defaultValue: 0 },
});

module.exports = Subscription;
