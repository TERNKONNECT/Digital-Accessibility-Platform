const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PaymentHistory = sequelize.define("PaymentHistory", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  provider: { type: DataTypes.ENUM("stripe", "paystack", "manual"), allowNull: false, defaultValue: "manual" },
  amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "NGN" },
  status: { type: DataTypes.ENUM("initiated", "pending", "successful", "failed"), allowNull: false, defaultValue: "initiated" },
  reference: { type: DataTypes.STRING, allowNull: true },
  paidAt: { type: DataTypes.DATE, allowNull: true },
});

module.exports = PaymentHistory;
