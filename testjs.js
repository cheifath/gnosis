const express = require("express");
const mysql = require("mysql");
const app = express();

app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "users_db"
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  // ❌ SQL Injection vulnerability
  const query = 
    "SELECT * FROM users WHERE username = '" +
    username +
    "' AND password = '" +
    password +
    "'";

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send("Database error");
      return;
    }

    if (results.length > 0) {
      res.send("Login successful");
    } else {
      res.status(401).send("Invalid credentials");
    }
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
