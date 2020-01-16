const jwt = require('jsonwebtoken');
const Logger = require('./Logger');
const config = require('../config');

module.exports = {
    parseBoolean(str) {
        if (typeof (str) === 'boolean') {
            return str;
        }

        return str == 'true' || str == '1';
    },

    preparePagination(query) {
        return {
            limit: query.limit ? parseInt(query.limit) : 100,
            offset: query.offset ? parseInt(query.offset) : null
        }
    },

    checkToken(token) {
        try {
            return jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
        } catch (err) {
            Logger.err(err.message);
            return false;
        }
    },

    createToken(data) {
        try {
            return jwt.sign(data, config.jwtSecret, { algorithm: 'HS256' })
        }
        catch (err) {
            Logger.err(err);
        }
    }

}