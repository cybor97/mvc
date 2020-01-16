const sequelize = require('sequelize');
const IDataModel = require('./IDataModel');

class DataSource extends IDataModel {
    async init() {
        this.model = this.connection.define('dataSource', {
            id: {
                type: sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true
            },
            url: {
                type: sequelize.STRING,
                allowNull: false
            },
            name: {
                type: sequelize.STRING,
                allowNull: false,
                validate: {
                    notEmpty: true
                }
            },
            description: {
                type: sequelize.TEXT,
                allowNull: true
            }
        });

        await this.model.sync({ alter: true });

        return this;
    }
}

module.exports = DataSource;