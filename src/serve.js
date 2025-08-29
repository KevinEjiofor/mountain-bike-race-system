require("dotenv").config();

const express = require("express");
const cors = require("cors"); // ✅ added
const connectDB = require("./config/DataBaseConfig");
const adminRoutes = require('./routes/adminAuthRoutes');
const raceRoutes = require('./routes/raceRoutes');
const riderRoutes = require('./routes/riderRoutes');

const app = express();


connectDB();


const corsOptions = {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
};

app.use(cors(corsOptions))

app.use(express.json());

app.get("/", (req, res) => {
    res.send("🚴 Welcome to the Mountain Bike Race System!");
});

app.use('/api/admin', adminRoutes);
app.use('/api/races', raceRoutes);
app.use('/api/riders', riderRoutes)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
