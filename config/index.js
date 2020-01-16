/**
 * @author cybor97
 */
const path = require('path');
const fs = require('fs');
const Logger = require('../utils/Logger');

const configFilename = path.join(__dirname, './config.json');

if (!fs.existsSync(configFilename)) {
    Logger.err("File config.json doesn't exist!")
    Logger.info('Should contain "host", "database", "username" and "password" keys.');
    process.kill(process.pid);
}

module.exports = Object.assign({
    //5s
    updateInterval: 5000,

    vkCommonUrl: 'https://vk.com',
    vkApiUrl: 'https://api.vk.com/method',
    vkOAuthApi: 'https://oauth.vk.com'
},
    JSON.parse(fs.readFileSync(configFilename)),
    {
        jwtPublicKey: fs.existsSync(path.join(__dirname, "authorized.pub")) ? fs.readFileSync(path.join(__dirname, "authorized.pub")) : 'invalid'
    }
);
