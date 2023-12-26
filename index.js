require('dotenv').config();

const pc = require('picocolors');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();

app.use(helmet()); // Security headers
app.use(express.json()); // for parsing application/json body
app.use(cookieParser()); // for parsing req.cookies

// Auth Routing & Rate Limiting

app.use("/auth", require("./routes/auth")); // Handling /auth routes
app.use("/auth", rateLimit({
    windowMs: 60000, // 1 minute
    max: 10, // 10 requests / 1 minute
    message: { success: false, message: 'Too many requests, please try again later' }
}));

// Respond to Default Route

app.get('/', (req, res) => {
    res.send({ success: true, message: 'OK' });
});

// Application Startup

console.log(pc.yellow('[MONGODB] Connecting to MongoDB...'));

require('./modules/database').connect().then(() => {
    console.log(pc.green('[MONGODB] Connected to MongoDB'));

    app.listen(3001, () => {
        console.log(pc.green('[EXPRESS] Listening on http://localhost:3001/'));
    });
});