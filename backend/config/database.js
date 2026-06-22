require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Sequelize } = require("sequelize");

const dialect = (process.env.DB_DIALECT || "sqlite").toLowerCase();
const logging = process.env.DB_LOGGING === "true" ? console.log : false;

function createSqliteConnection() {
  const storage = process.env.DATABASE_STORAGE || path.join("data", "database.sqlite");
  const resolvedStorage = path.resolve(__dirname, "..", storage);

  fs.mkdirSync(path.dirname(resolvedStorage), { recursive: true });

  return new Sequelize({
    dialect: "sqlite",
    storage: resolvedStorage,
    logging,
  });
}

const postgresSslOptions = process.env.DB_SSL === "false" ? {} : {
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
};

function createPostgresConnection() {
  if (process.env.DATABASE_URL) {
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      logging,
      ...postgresSslOptions,
    });
  }

  return new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: "postgres",
      logging,
      ...postgresSslOptions,
    }
  );
}

const sequelize = dialect === "postgres" ? createPostgresConnection() : createSqliteConnection();

module.exports = sequelize;
