const path = require("path");
const { Sequelize } = require("sequelize");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Managed Postgres (Render/Neon/etc.) requires SSL and hands you a single DATABASE_URL.
// Local dev uses the individual DB_* vars with no SSL. DB_SSL=true forces SSL on the
// individual-var path if ever needed.
const wantsSsl =
  !!process.env.DATABASE_URL || String(process.env.DB_SSL || "").toLowerCase() === "true";
const dialectOptions = wantsSsl
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {};

let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: false,
    dialectOptions,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    String(process.env.DB_PASSWORD), // Ensure password is a string
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: "postgres",
      logging: false,
      dialectOptions,
    }
  );
}

sequelize.authenticate()
  .then(() => console.log("Database connected successfully"))
  .catch(err => console.log("Error connecting to the database:", err));

module.exports = sequelize;

