const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define("User", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { 
    type: DataTypes.ENUM("superadmin", "solo", "org_admin", "org_user"), 
    defaultValue: "solo" 
  },
  emailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  emailVerificationToken: { type: DataTypes.STRING, allowNull: true },
  emailVerificationExpires: { type: DataTypes.DATE, allowNull: true },
  passwordResetToken: { type: DataTypes.STRING, allowNull: true },
  passwordResetExpires: { type: DataTypes.DATE, allowNull: true },
});

module.exports = User;
