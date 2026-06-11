const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Organization = sequelize.define("Organization", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  billingStatus: { 
    type: DataTypes.ENUM("active", "inactive", "past_due", "canceled"), 
    defaultValue: "active" 
  },
});

module.exports = Organization;
