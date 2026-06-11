const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Subscription = sequelize.define("Subscription", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  plan: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM("active", "canceled", "expired"), defaultValue: "active" },
  targetEntity: { type: DataTypes.ENUM("user", "organization"), allowNull: false },
  limits: { type: DataTypes.JSONB, defaultValue: {} }, // e.g. { tokens: 100000 }
  startsAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  endsAt: { type: DataTypes.DATE, allowNull: true },
});

module.exports = Subscription;
