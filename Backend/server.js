const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const ehrRoutes = require("./routes/ehrRoutes");
const cors = require("cors");

dotenv.config();
connectDB();

const app = express();

// ✅ Enable CORS for your React frontend
app.use(cors({
  origin: "http://localhost:5173",  // your Vite app
  credentials: true
}));

app.use(express.json());

// Routes

app.use("/api/ehr", ehrRoutes);
app.use("/api/auth", require("./routes/authRoutes")); // new auth routes
app.use("/api/python", require("./routes/pythonRoutes"));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
