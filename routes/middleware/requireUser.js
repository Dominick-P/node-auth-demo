const database = require("../../modules/database").client();
const { verifyJWT } = require("../../modules/jwt");
const { getSession, refreshSession, createSessionTokens } = require("../../modules/session");

const Accounts = database.db("Accounts").collection("Accounts");

module.exports = async (req, res, next) => {
    const accessToken = req.cookies.token;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken || !refreshToken)
        return res.status(401).send({ success: false, message: 'Unauthorized' });

    const accessTokenPayload = verifyJWT(accessToken);

    if (!accessTokenPayload) { // No/invalid access token, check refresh token 
        res.cookie('token', '', { maxAge: 0, httpOnly: true, secure: process.platform === 'linux' }); // Reset cookies to clear invalid tokens
        res.cookie('refreshToken', '', { maxAge: 0, httpOnly: true, secure: process.platform === 'linux' });

        const refreshTokenPayload = verifyJWT(refreshToken);
        if (!refreshTokenPayload) return res.status(401).send({ success: false, message: 'Unauthorized' }); // No/invalid refresh token

        const session = await getSession(refreshTokenPayload.sessionId);
        if (!session) return res.status(401).send({ success: false, message: 'Unauthorized' }); // Invalid session

        // Refresh Session & Issue new tokens

        await refreshSession(refreshTokenPayload.sessionId);

        const accountData = await Accounts.findOne({ id: session.accountId });

        const { token: newAccessToken, refreshToken: newRefreshToken } = createSessionTokens(accountData, sessionInfo.sessionId);

        res.cookie('token', newAccessToken, { httpOnly: true, maxAge: 3.6e+6, secure: process.platform === 'linux' });
        res.cookie('refreshToken', newRefreshToken, { httpOnly: true, maxAge: 3.154e10, secure: process.platform === 'linux' });
    }

    req.user = accessTokenPayload;
    next();
}