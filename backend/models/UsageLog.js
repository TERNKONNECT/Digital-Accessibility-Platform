const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UsageLog = sequelize.define("UsageLog", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  actionType: { type: DataTypes.STRING, allowNull: false },
  tokensUsed: { type: DataTypes.INTEGER, defaultValue: 0 },
});

module.exports = UsageLog;
