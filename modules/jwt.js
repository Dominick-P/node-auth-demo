const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;

module.exports = {
    signJWT: (payload, expiresIn) => {
        return jwt.sign(payload, jwtSecret, { algorithm: 'HS256', expiresIn: expiresIn });
    },

    verifyJWT: (token) => {
        try {
            return jwt.verify(token, jwtSecret);
        } catch (e) {
            return false;
        }
    }
};