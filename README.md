💱 Currency Exchanger API (HNG Stage 2)

A simple RESTful API built with Node.js (Express) and MySQL, designed to manage and serve country data including population, currency, estimated GDP, and flag images.
This project connects to a MySQL database hosted on Railway and demonstrates basic CRUD-like operations with external API integration.

🚀 Features

Fetches and stores country data from an external API.

Allows refreshing and updating the local database with new data.

Retrieves country image data by name.

Includes proper error handling for all endpoints.

Built for easy deployment on Railway.

🗂️ Project Structure
currency-exchanger/
│
├── index.js              # Main server file
├── package.json
├── .env                  # Environment variables
├── .gitignore
├── test_db.js            # Test database connection script
└── README.md

⚙️ Environment Variables

Create a .env file in your project root with the following:

DB_HOST=containers-us-west-123.railway.app
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_mysql_database_name
PORT=3000


(Replace the placeholders with your actual Railway MySQL credentials.)

🧱 Database Schema

Create a table named countries in your MySQL database using this SQL:

CREATE TABLE IF NOT EXISTS countries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  capital VARCHAR(255),
  region VARCHAR(255),
  population BIGINT NOT NULL,
  currency_code VARCHAR(10),
  exchange_rate DECIMAL(20,6),
  estimated_gdp DECIMAL(30,2),
  flag_url TEXT,
  last_refreshed_at DATETIME,
  UNIQUE KEY unique_name (name)
);

🧠 API Endpoints
1️⃣ POST /countries/refresh

Fetches country data from an external API and stores it in the database.

Response:

{
  "message": "Countries refreshed successfully"
}

2️⃣ GET /countries

Returns all countries stored in the database.

Response:

[
 {
    "id": 1,
    "name": "Nigeria",
    "population": 200000000,
    "currency": "NGN",
    "estimated_gdp": 400.5,
    "image_url": "https://example.com/nigeria.png"
  }
]

3️⃣ GET /countries/image?name=CountryName

Fetches the flag image and country details for a specific country.

Response:

{
  "message": "Country image fetched successfully",
  "country": "Nigeria",
  "image_url": "https://example.com/nigeria.png"
}


Error Example:

{ "error": "Country not found" }

🧪 Testing with Postman

Use the following URLs:

POST http://localhost:3000/countries/refresh

GET http://localhost:3000/countries

GET http://localhost:3000/countries/image?name=Nigeria

🖥️ Deployment on Railway

Push your code to GitHub.

Create a new project on Railway.app
.

Connect your GitHub repository.

Add environment variables from the Railway MySQL service.

Deploy — your API will automatically build and run.


Author = Mael 
