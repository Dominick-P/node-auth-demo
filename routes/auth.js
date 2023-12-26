const { Router } = require('express');
const router = Router();

const axios = require('axios');
const { UUID } = require('mongodb');
const bcrypt = require('bcrypt');
const requireUser = require('./middleware/requireUser');
const { createSession, deleteSession, createSessionTokens } = require('../modules/session');
const database = require('../modules/database').client();
const Accounts = database.db('Accounts').collection('Accounts');

// Password Login and Registration

router.post("/login", async (req, res) => {
    const email = req.body.email.toString().toLowerCase();
    const password = req.body.password.toString();

    if (!email || !password || email.length > 50 || password.length > 50) return res.status(400).send({ success: false, message: 'Invalid email or password' });

    const account = await Accounts.findOne({ email: email });

    if (!account) return res.status(401).send({ success: false, message: 'Invalid email or password' });
    if (account.type == "google") return res.status(401).send({ success: false, message: 'Please login using Google' });

    if (!bcrypt.compareSync(password, account.password))
        return res.status(401).send({ success: false, message: 'Invalid email or password' });

    // Create Session

    const sessionInfo = await createSession(account.id);

    // Create Access Token and Refresh Token

    const { token, refreshToken } = createSessionTokens(account, sessionInfo.sessionId);

    res.cookie('token', token, { httpOnly: true, maxAge: 3.6e+6, secure: process.platform === 'linux' }); // 1h = 3.6e+6
    res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 3.154e10, secure: process.platform === 'linux' }); // 1y = 3.154e10

    res.send({ success: true, user: { id: account.id, email: account.email, name: account.name } });
});

router.post("/register", async (req, res) => {
    const email = req.body.email.toString();
    const password = req.body.password.toString();

    if (!email || !password) return res.status(400).send({ success: false, message: 'Invalid email or password' });
    if (!email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g) || email.length > 50 || password.length > 50) return res.status(400).send({ success: false, message: 'Invalid email or password' });

    const existingAccount = await Accounts.findOne({ email: email.toLowerCase() });
    if (existingAccount) return res.status(400).send({ success: false, message: 'Email is already in use' });

    const accountData = {
        id: "ACCOUNT-" + new UUID(),
        email: email.toLowerCase(),
        password: bcrypt.hashSync(password, 10),
        name: email.split('@')[0]
    };

    await Accounts.insertOne(accountData);

    res.send({ success: true });
});

// Google Login and Registration

router.get("/google", (req, res) => {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: "http://localhost:3001/auth/google/callback",
        response_type: "code",
        scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
        access_type: "offline"
    });

    res.redirect(`${rootUrl}?${options.toString()}`);
});

router.get("/google/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send({ success: false, message: 'Invalid code' });

    const tokens = await axios.post("https://oauth2.googleapis.com/token", {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: "http://localhost:3001/auth/google/callback",
        grant_type: "authorization_code"
    });

    if (!tokens.data.access_token) return res.status(400).send({ success: false, message: 'Invalid code' });

    const userInfo = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.data.access_token}`);
    if (userInfo.data.verified_email != true) return res.status(400).send({ success: false, message: 'Please verify your email in your Google account' });

    // Handle Account Creation or Login

    let account = await Accounts.findOne({ email: userInfo.data.email.toLowerCase() });

    if (!account) {
        account = {
            id: "ACCOUNT-" + new UUID(),
            email: userInfo.data.email.toLowerCase(),
            name: userInfo.data.name,
            type: "google"
        };

        await Accounts.insertOne(account);
    }

    // Create Session

    const sessionInfo = await createSession(account.id);
    const { token, refreshToken } = createSessionTokens(account, sessionInfo.sessionId);

    res.cookie('token', token, { httpOnly: true, maxAge: 3.6e+6, secure: process.platform === 'linux' }); // 1h = 3.6e+6
    res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 3.154e10, secure: process.platform === 'linux' }); // 1y = 3.154e10

    res.send({ success: true, tokenInfo: userInfo.data });
});


// Session Management Routes

router.get("/me", requireUser, async (req, res) => {
    res.send({ success: true, user: req.user });
});

router.post("/logout", requireUser, async (req, res) => {
    await deleteSession(req.user.sessionId);

    res.cookie("token", "", { maxAge: 0, httpOnly: true, secure: process.platform === 'linux' });
    res.send({ success: true });
})

module.exports = router;