/**
 * @author cybor97
 */
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize').Sequelize;

const config = require('../config');
const IDataModel = require('./models/IDataModel');
const Logger = require('../utils/Logger');

class DBConnection {
    static async init() {
        this.connection = new Sequelize({
            dialect: config.dialect,
            host: config.host,
            database: config.database,
            username: config.username,
            password: config.password,
            logging: (process.argv.indexOf('-v') != -1) ? console.log : null,
            pool: {
                max: 3,
                min: 0,
                acquire: 10000,
                idle: 5000
            }
        });
        this.models = {};

        const modelsPath = path.join(__dirname, 'models');
        let models = fs.readdirSync(modelsPath);
        for (let model of models) {
            if (model != 'IDataModel.js') {
                let modelInstance = new (require(path.join(modelsPath, model)))(this.connection);
                if (modelInstance instanceof IDataModel) {
                    this.models[model.split('.js').shift()] = modelInstance;
                    await modelInstance.init();
                }
                else {
                    Logger.warn(`Invalid model ${model}`, modelInstance);
                }
            }
        }

        return this;
    }

    static getModels() {
        for (let model of Object.values(this.models)) {
            if (!model instanceof IDataModel) {
                throw new Error('All data models should be instances of IDataModel!');
            }
        }
        return this.models;
    }

    static getConnection() {
        return this.connection;
    }
}

module.exports = DBConnection;
