import express from "express";
import axios from "axios";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static("cache"));

const db = await mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

let lastRefreshedAt = null;

// Helper: random multiplier 1000–2000
const getRandomMultiplier = () => Math.floor(Math.random() * 1001) + 1000;

// ======================= POST /countries/refresh =======================
app.post("/countries/refresh", async (req, res) => {
  try {
    // Fetch countries & exchange rates
    const countriesResp = await axios.get(
      "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies"
    );
    const exchangeResp = await axios.get("https://open.er-api.com/v6/latest/USD");
    const rates = exchangeResp.data.rates;

    // Loop through countries
    for (let c of countriesResp.data) {
      const currency = c.currencies && c.currencies.length ? c.currencies[0].code : null;
      const exchangeRate = currency && rates[currency] ? rates[currency] : null;
      const estimatedGdp = exchangeRate
        ? (c.population * getRandomMultiplier()) / exchangeRate
        : null;

      await db.query(
        `INSERT INTO countries
          (name, capital, region, population, currency_code, exchange_rate, estimated_gdp, flag_url, last_refreshed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
          capital=VALUES(capital),
          region=VALUES(region),
          population=VALUES(population),
          currency_code=VALUES(currency_code),
          exchange_rate=VALUES(exchange_rate),
          estimated_gdp=VALUES(estimated_gdp),
          flag_url=VALUES(flag_url),
          last_refreshed_at=NOW()`,
        [c.name, c.capital, c.region, c.population, currency, exchangeRate, estimatedGdp, c.flag]
      );
    }

    // Update global lastRefreshedAt only after successful DB updates
    lastRefreshedAt = new Date();

    // Generate summary image safely (handle null GDP)
    const [rows] = await db.query(
      `SELECT name, estimated_gdp FROM countries ORDER BY estimated_gdp DESC LIMIT 5`
    );

    const imageText = `Total countries: ${countriesResp.data.length}\nTop 5 GDPs:\n${rows
      .map((r) => {
        if (r.estimated_gdp === null || r.estimated_gdp === undefined) return `${r.name}: N/A`;
        return `${r.name}: ${Number(r.estimated_gdp).toFixed(2)}`;
      })

      .join("\n")}\nLast refreshed: ${lastRefreshedAt.toISOString()}`;

    if (!fs.existsSync("cache")) fs.mkdirSync("cache");

    const svgImage = `
      <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="400" fill="white"/>
        <text x="20" y="40" font-size="22" fill="black">${imageText.replace(/\n/g, "&#10;")}</text>
      </svg>
    `;

    await sharp(Buffer.from(svgImage)).png().toFile(path.join(__dirname, "cache", "summary.png"));

    res.json({ message: "Countries refreshed successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(503).json({
      error: "External data source unavailable",
      details: error.message,
    });
  }
});

// ======================= GET /countries =======================
app.get("/countries", async (req, res) => {
  try {
    const { region, currency, sort } = req.query;
    let query = "SELECT * FROM countries WHERE 1=1";
    const params = [];

    if (region) { query += " AND region = ?"; params.push(region); }
    if (currency) { query += " AND currency_code = ?"; params.push(currency); }
    if (sort === "gdp_desc") query += " ORDER BY estimated_gdp DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ======================= GET /countries/:name =======================
app.get("/countries/:name", async (req, res) => {
  const [rows] = await db.query(
    "SELECT * FROM countries WHERE LOWER(name) = LOWER(?)",
    [req.params.name]
  );
  if (!rows.length) return res.status(404).json({ error: "Country not found" });
  res.json(rows[0]);
});

// ======================= DELETE /countries/:name =======================
app.delete("/countries/:name", async (req, res) => {
  const [result] = await db.query(
    "DELETE FROM countries WHERE LOWER(name) = LOWER(?)",
    [req.params.name]
  );
  if (!result.affectedRows) return res.status(404).json({ error: "Country not found" });
  res.json({ message: "Country deleted" });
});

// ======================= GET /status =======================
app.get("/status", async (req, res) => {
  const [rows] = await db.query("SELECT COUNT(*) as total FROM countries");
  res.json({
    total_countries: rows[0].total,
    last_refreshed_at: lastRefreshedAt ? lastRefreshedAt.toISOString() : "Not refreshed yet",
  });
});

// ======================= GET /countries/image =======================
app.get("/countries/image", (req, res) => {
  const imagePath = path.join(__dirname, "cache", "summary.png");
  if (!fs.existsSync(imagePath)) return res.status(404).json({ error: "Summary image not found" });
  res.sendFile(imagePath);
});

// ======================= Server Start =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
