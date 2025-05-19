const express = require("express");
const session = require("express-session");
const blogGenerator = require("./blogGenerator");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
const { exec } = require('child_process');
const { sendEmail } = require('./emailService');
const cors = require("cors");

const pool = require("./db");

require("dotenv").config();
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
const cron = require("node-cron");

const app = express();
// const PORT =  3000;
const PORT = process.env.PORT || 3000;

// Cache for 5 minutes (300 seconds)

// Rate limiting (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

// -----------------------------------------------------

// app.use(cors({
//   origin: 'https://aidf-home-interior-service.vercel.app',
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   credentials: true
// }));

// app.use(cors());

app.use(cors({
  origin: ['https://aidf-home-interior-service.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));






app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true for HTTPS in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));



// ----------------------------------------------------------------

app.use(express.json());
app.use(limiter);



app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ---------------gemini blog generation--------------------------

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to generate blog content using Gemini
async function generateBlog() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `Generate a professional blog post on interior design topics  :
  "skirting and profile",
  "flooring",
  "carpet working"
,    
    choose one of the topic and make sure for the next 60 days the title and the content of the blog must not be the same.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract title (first line) and content (rest)
    const title = text.split("\n")[0].replace("Title: ", "").trim();
    const content = text.split("\n").slice(1).join("\n").trim();

    console.log("title----", title);
    console.log("content----", content);

    return { title, content };
  } catch (error) {
    console.error("Error generating blog:", error);
    throw error;
  }
}

//--------------------- Function to save blog to database------------------
async function saveBlogToDB(title, content) {
  try {
    const [result] = await pool.execute(
      "INSERT INTO blogs (title, content) VALUES (?, ?)",
      [title, content]
    );
    console.log(`Blog saved with ID: ${result.insertId}`);
    return result;
  } catch (error) {
    console.error("Error saving blog to database:", error);
    throw error;
  }
}

//--------------- Scheduled job to generate and save blog every 2 days-------------------
cron.schedule(
  "0 0 */2 * * ",

  async () => {
    console.log("Running scheduled blog generation...");
    try {
      const { title, content } = await generateBlog();
      await saveBlogToDB(title, content);
      console.log("Blog generated and saved successfully!");
    } catch (error) {
      console.error("Error in scheduled job:", error);
    }
  },
  {
    scheduled: true,
    timezone: "America/New_York", // Set your timezone
  }
);

//------------------- API endpoint to manually trigger blog generation-----------
app.get("/generate-blog", async (req, res) => {
  try {
    const { title, content } = await generateBlog();
    await saveBlogToDB(title, content);
    res.json({
      success: true,
      message: "Blog generated and saved successfully!",
    });
  } catch (error) {
    console.error("Error in manual generation:", error);
    res.status(500).json({ success: false, message: "Error generating blog" });
  }
});

//---------------------------- API endpoint to get all blogs--------------------------
app.get("/blogs", async (req, res) => {
  console.log("request from live---");
  try {
    const [rows] = await pool.query(
      "SELECT * FROM blogs ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ success: false, message: "Error fetching blogs" });
  }
});

// ------------------get unique blog by id-----------------------

app.get("/getUniqueBlog/:blogId", async (req, res) => {
  const { blogId } = req.params;
  console.log("blogId---", blogId);
  try {
    const query = "SELECT * FROM blogs WHERE id=?";
    const [row] = await pool.query(query, [blogId]);
    console.log("row of unique blog by id---", row);
    res.json(row);
  } catch (err) {
    console.log("error fetching blog by id--", err);
    res.status(500).json({ message: "error fetching blog by id", error: err });
  }
});






// ----------------------------------------Form Service-----------------------------------------------------------------------------





app.post("/submit-enquiry", async (req, res) => {
  try {
    console.log("enquiry body----", req.body);
    const { name, phone, email, service, message } = req.body;

    // Validate input
    if (!name || !email || !phone) {
      return res.status(400).json({ 
        success: false,
        message: "Name, email, and phone are required"
      });
    }

    // Save to database
    await pool.query(
      `INSERT INTO enquiries (name, phone, email, service, message) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, phone, email, service, message]
    );

    // Send email
    await sendEmail('enquiry', { name, phone, email, service, message });
    
    res.json({ 
      success: true,
      message: "Enquiry submitted successfully!" 
    });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});




// ----------------------------------------quote---------------------------------------------




// app.post("/submit-quote", async (req, res) => {
//   try {
//     const { name, phone, email, price, height, material, finish } = req.body;

//     // Validate input
//     if (!name || !email || !phone) {
//       return res.status(400).json({ 
//         success: false,
//         message: "Name, email and phone are required"
//       });
//     }

//     // Save to database
//     await pool.query(
//       `INSERT INTO quotes (name, phone, email, price, height, material, finish) 
//        VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [name, phone, email, price, height, material, finish]
//     );

//     // Send email
//     await sendEmail('quote', { name, phone, email, price, height, material, finish });
    
//     res.json({ 
//       success: true,
//       message: "Quote submitted successfully!" 
//     });
//   } catch (error) {
//     console.error("Server Error:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Internal server error",
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });





app.post("/submit-quote", async (req, res) => {
  console.log("Received quote submission:", req.body);
  try {
    const { name, phone, email, price, height, material, finish } = req.body;

    if (!name || !email || !phone) {
      console.log("Validation failed - missing required fields");
      return res.status(400).json({ 
        success: false,
        message: "Name, email and phone are required"
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
    await sendEmail('quote', { name, phone, email, price, height, material, finish });
    console.log("Email sent successfully");
    
    res.json({ 
      success: true,
      message: "Quote submitted successfully!" 
    });
  } catch (error) {
    console.error("Full error in submit-quote:", {
      message: error.message,
      stack: error.stack,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});






// ------------------------------------------------------------------------------------------



// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  blogGenerator.initializeScheduler();
});
