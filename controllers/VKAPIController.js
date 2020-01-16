const childProcess = require('child_process');
const https = require('https');
const axios = require('axios');
const FormData = require('form-data');
const IController = require('./IController');
const Logger = require('../utils/Logger');
const config = require('../config');
const utils = require('../utils');

const DBConnection = require('../data');

class VKAPIController extends IController {
    constructor() {
        super();
    }

    async init() {
        this.axios = axios.create({
            timeout: 10000,
            httpsAgent: new https.Agent({ keepAlive: true }),
        });
        this.models = DBConnection.models;

        return this;
    }

    async fetchOauth() {
        return {
            status: 200,
            data: {
                appId: config.vk.appId,
                //notify | offline
                scope: 1 | 65536,
                responseType: 'code',
                version: '5.103'
            }
        };
    }

    async callbackOauth(params) {
        let { data } = await this.axios.get(`${config.vkOAuthApi}/access_token`, {
            params: {
                client_id: config.vk.appId,
                client_secret: config.vk.appSecret,
                code: params.code,
                redirect_uri: `${params.redirect_uri}`
            },
            validateStatus: false
        });

        let user = null;
        if (data.user_id && Object.keys(config.vk.admins).includes(data.user_id.toString())) {
            user = await this.models.User.model.findOne({
                where: {
                    vkUserId: data.user_id
                }
            });
            if (user) {
                user.role = ROLE_ADMIN;
                await user.save();
            }
        }
        if (data.error) {
            Logger.err(`${data.error}: ${data.error_description}`);
        }

        return { status: !data.error && user ? 200 : 401, data: { token: data.user_id ? user ? utils.createToken({ id: user.id }) : `User ${data.user_id} not found!` : 'Unauthorized' } };
    }
}

module.exports = VKAPIController;