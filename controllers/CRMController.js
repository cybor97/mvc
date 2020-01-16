const https = require('https');
const axios = require('axios');
const sequelize = require('sequelize');
const IController = require('./IController');
const Logger = require('../utils/Logger');
const config = require('../config');
const utils = require('../utils');

const DBConnection = require('../data');

class CRMController extends IController {
    constructor() {
        super();
        this.authorizationRequired = true;
        this.checkAclRequired = true;
    }

    init() {
        this.axios = axios.create({
            timeout: 10000,
            httpsAgent: new https.Agent({ keepAlive: true })
        });
        this.models = DBConnection.models;

        return this;
    }

    async authorize(params) {
        let tokenData = utils.checkToken(params['x-token']);
        if (!tokenData) {
            return null;
        }

        let user = await this.models.User.model.findOne({ where: { id: tokenData.id } });
        if (user) {
            return { userId: user.id };
        }
    }

    async checkAcl(params) {
        let user = await this.models.User.model.findOne({ where: { id: params.userId } });
        if (user && user.role === ROLE_ADMIN) {
            return user.dataValues;
        }

        return false;
    }

    async getUsers(params) {
        let whereParams = params.where && JSON.parse(params.where);
        if (params.searchQuery) {
            if (!whereParams) {
                whereParams = {};
            }

            let searchQuery = { [sequelize.Op.like]: `%${params.searchQuery}%` };
            whereParams = Object.assign(whereParams, {
                [sequelize.Op.or]: {
                    vkUserId: searchQuery,
                    firstname: searchQuery,
                    lastname: searchQuery,
                    orgType: searchQuery,
                    path: searchQuery,
                    context: searchQuery,
                }
            });
        }


        return {
            status: 200,
            data: await this.models.User.model.findAndCountAll(Object.assign({
                where: whereParams,
                order: params.order
            }, utils.preparePagination(params)))
        };
    }

    async setUser(params) {
        let user = await this.models.User.model.findOne({ where: { id: params.id } });
        if (!user) {
            return { status: 404, data: 'No user found!' };
        }

        return {
            status: 200,
            data: await user.update(params)
        };
    }

    async removeUser(params) {
        let user = await this.models.User.model.findOne({ where: { id: params.id } });
        if (!user) {
            return { status: 404, data: 'No user found!' };
        }

        await user.destroy(params);

        return {
            status: 200,
            data: user.dataValues
        };
    }

    async fetchAllUsersData() {
        let users = await this.models.User.model.findAll();
        for (let user of users) {
            Logger.info(`Updating user ${user.id} (id${user.vkUserId})`);
            let { data } = await this.axios.get(`${config.vkApiUrl}/users.get`, {
                params: {
                    user_ids: user.vkUserId,
                    name_case: 'Nom',
                    v: '5.103',
                    access_token: config.vk.accessToken
                }
            });
            if (data && data.response && data.response.length) {
                data = data.response.pop();
                user.firstname = data.first_name;
                user.lastname = data.last_name;
            }
            await user.save();
            Logger.info(`Updated user ${user.id} (id${user.vkUserId})`);

            await new Promise(resolve => setTimeout(resolve, ~~(Math.random() * 500 + 100)));
        }

        return { status: 200, data: { success: true, count: users.length } };
    }

    async getBooks(params) {
        let whereParams = params.where && JSON.parse(params.where);
        if (params.searchQuery) {
            if (!whereParams) {
                whereParams = {};
            }

            let searchQuery = { [sequelize.Op.like]: `%${params.searchQuery}%` };
            whereParams = Object.assign(whereParams, {
                [sequelize.Op.or]: {
                    url: searchQuery,
                    name: searchQuery,
                    subject: searchQuery,
                    author: searchQuery,
                    description: searchQuery,
                    keywords: searchQuery,
                }
            });
        }

        return {
            status: 200,
            data: await this.models.Book.model.findAndCountAll(Object.assign({
                where: whereParams,
                order: params.order
            }, utils.preparePagination(params)))
        };
    }

    async setBook(params) {
        let book = await this.models.Book.model.findOne({ where: { id: params.id } });
        if (!book) {
            return { status: 404, data: 'No book found!' };
        }

        return {
            status: 200,
            data: await book.update(params)
        };
    }

    async removeBook(params) {
        let book = await this.models.Book.model.findOne({ where: { id: params.id } });
        if (!book) {
            return { status: 404, data: 'No book found!' };
        }

        await book.destroy(params);

        return {
            status: 200,
            data: book.dataValues
        };
    }

    async getBookPages(params) {
        return {
            status: 200,
            data: await this.models.BookPage.model.findAndCountAll(Object.assign({
                where: Object.assign(params.where || {}, { bookId: params.id }),
                order: params.order
            }, utils.preparePagination(params)))
        };
    }

    async getBookPagesAll(params) {
        return {
            status: 200,
            data: await this.models.BookPage.model.findAndCountAll(Object.assign({
                where: params.where || {},
                order: params.order
            }, utils.preparePagination(params)))
        };
    }

    async addBookPage(params) {
        if (!params.url) {
            params.url = 'localhost';
        }
        let bookPageRecord = await this.models.BookPage.model.create(params);

        return { status: 200, data: bookPageRecord.dataValues };
    }

    async setBookPage(params) {
        let bookPage = await this.models.BookPage.model.findOne({ where: { id: params.id } });
        if (!bookPage) {
            return { status: 404, data: 'No bookPage found!' };
        }

        return {
            status: 200,
            data: await bookPage.update(params)
        };
    }

    async removeBookPage(params) {
        let bookPage = await this.models.BookPage.model.findOne({ where: { id: params.id } });
        if (!bookPage) {
            return { status: 404, data: 'No bookPage found!' };
        }

        await bookPage.destroy(params);

        return {
            status: 200,
            data: bookPage.dataValues
        };
    }

    async getPhrases(params) {
        return {
            status: 200,
            data: await this.models.Phrase.model.findAndCountAll(Object.assign({
                where: params.where,
                order: params.order
            }, utils.preparePagination(params)))
        };
    }

    async setPhrase(params) {
        if (!params.value) {
            return { status: 400, data: 'value should be specified!' };
        }

        let [phrase, created] = await this.models.Phrase.model.findOrCreate({ where: { key: params.key }, defaults: { key: params.key } });
        phrase.value = params.value;
        await phrase.save();

        return { status: 200, data: phrase };
    }

    async removePhrase(params) {
        let phrase = await this.models.Phrase.model.findOne({ where: { key: params.key } });
        if (phrase) {
            await phrase.destroy();
        }

        return { status: 200, data: phrase };
    }
}

module.exports = CRMController;