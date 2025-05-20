const express = require("express");
const session = require("express-session");

const { sendEmail } = require("./emailService");
const cors = require("cors");

const pool = require("./db");

require("dotenv").config();

const rateLimit = require("express-rate-limit");

const app = express();
// const PORT =  3000;
const PORT = process.env.PORT || 3000;

// Cache for 5 minutes (300 seconds)

// Rate limiting (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(cors());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true for HTTPS in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

// ----------------------------------------------------------------

app.use(express.json());
app.use(limiter);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------Form Service-----------------------------------------------------------------------------

app.post("/submit-enquiry", async (req, res) => {
  try {
    console.log("enquiry body----", req.body);
    const { name, phone, email, service, place, message } = req.body;

    // Validate input
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and phone are required",
      });
    }

    // Save to database
    await pool.query(
      `INSERT INTO enquiries (name, phone, email, service, place, message) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, phone, email, service, place, message]
    );

    // Send email
    await sendEmail("enquiry", { name, phone, email, service, place, message });

    res.json({
      success: true,
      message: "Enquiry submitted successfully!",
    });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ----------------------------------------quote---------------------------------------------

app.post("/submit-quote", async (req, res) => {
  console.log("Received quote submission:", req.body);
  try {
    const { name, phone, email, price, height, material, finish } = req.body;

    if (!name || !email || !phone) {
      console.log("Validation failed - missing required fields");
      return res.status(400).json({
        success: false,
        message: "Name, email and phone are required",
      });
    }

    console.log("Attempting to save to database...");
    const [result] = await pool.query(
      `INSERT INTO quotes (name, phone, email, price, height, material, finish) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, email, price, height, material, finish]
    );
    console.log("Database save successful, ID:", result.insertId);

    console.log("Attempting to send email...");
    await sendEmail("quote", {
      name,
      phone,
      email,
      price,
      height,
      material,
      finish,
    });
    console.log("Email sent successfully");

    res.json({
      success: true,
      message: "Quote submitted successfully!",
    });
  } catch (error) {
    console.error("Full error in submit-quote:", {
      message: error.message,
      stack: error.stack,
      sqlMessage: error.sqlMessage,
    });
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ------------------------------------------------------------------------------------------

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  blogGenerator.initializeScheduler();
});
