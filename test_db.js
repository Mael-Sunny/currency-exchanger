import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

(async () => {
  try {
    console.log("⏳ Testing MySQL connection...");

    const pool = await mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
    });

    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM countries");
    console.log("✅ Connected successfully!");
    console.log(`Total countries in table: ${rows[0].total}`);
    await pool.end();
  } catch (error) {
    console.error("❌ Database connection failed!");
    console.error(error.message);
    process.exit(1);
  }
})();
