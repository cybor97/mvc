const sequelize = require('sequelize');
const IDataModel = require('./IDataModel');

class Phrase extends IDataModel {
    async init() {
        let model = this.connection.define('phrase', {
            id: {
                type: sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },
            key: {
                type: sequelize.STRING,
                allowNull: true
            },
            lang: {
                type: sequelize.STRING,
                allowNull: true,
            },
            value: {
                type: sequelize.TEXT,
                allowNull: true
            },
        }, {
            indexes: [{
                unique: true,
                fields: ['key', 'lang']
            }]
        });

        this.model = await model.sync({ alter: true });

        return this;
    }

    async getPhrase(key) {
        let phrase = await this.model.findOne({ where: { key } });
        return phrase && phrase.value;
    }
}

module.exports = Phrase;