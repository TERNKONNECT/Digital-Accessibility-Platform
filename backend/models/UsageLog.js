const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UsageLog = sequelize.define("UsageLog", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  actionType: { type: DataTypes.STRING, allowNull: false },
  tokensUsed: { type: DataTypes.INTEGER, defaultValue: 0 },
  // Populated by digital-accessibility-intelligence's usage reports for
  // actionType "voice_session"; null/0 for every other actionType.
  integrationId: { type: DataTypes.UUID, allowNull: true },
  durationSeconds: { type: DataTypes.FLOAT, defaultValue: 0 },
  toolCallCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  audioSeconds: { type: DataTypes.FLOAT, defaultValue: 0 },
});

module.exports = UsageLog;
