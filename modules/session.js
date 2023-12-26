const { UUID } = require('mongodb');
const { signJWT } = require('./jwt');
const database = require('./database').client();
const Sessions = database.db('Accounts').collection('Sessions');

module.exports = {
    // Create Session

    createSession: async (accountId) => {
        const sessionInfo = { sessionId: (new UUID()).toString(), accountId: accountId, createdAt: new Date(), expiresAt: new Date(Date.now() + 3.154e10) };
        await Sessions.insertOne(sessionInfo);

        return sessionInfo;
    },

    createSessionTokens: (account, sessionId) => {
        const token = signJWT({ id: account.id, email: account.email, name: account.name, sessionId: sessionId }, '1h');
        const refreshToken = signJWT({ sessionId: sessionId }, '1y');

        return { token, refreshToken };
    },

    getSession: async (sessionId) => {
        const sessionInfo = await Sessions.findOne({ sessionId: sessionId });

        if (sessionInfo && new Date() > sessionInfo.expiresAt) {
            Sessions.deleteOne({ sessionId: sessionId });
            return null;
        }

        return sessionInfo;
    },

    refreshSession: async (sessionId) => {
        await Sessions.updateOne({ sessionId: sessionId }, { $set: { expiresAt: new Date(Date.now() + 3.154e10) } });
    },

    deleteSession: async (sessionId) => {
        await Sessions.deleteOne({ sessionId: sessionId });
    },

}