const sequelize = require('sequelize');
const IDataModel = require('./IDataModel');

global.ROLE_USER = 1;
global.ROLE_ADMIN = 2;
global.USER_ROLES = [ROLE_USER, ROLE_ADMIN]

class User extends IDataModel {
    async init() {
        let model = this.connection.define('user', {
            id: {
                type: sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true
            },
            vkUserId: {
                type: sequelize.INTEGER,
                allowNull: true
            },
            role: {
                type: sequelize.INTEGER,
                allowNull: false,
                defaultValue: ROLE_USER
            },
            firstname: {
                type: sequelize.STRING,
                allowNull: true
            },
            lastname: {
                type: sequelize.STRING,
                allowNull: true
            },
            orgType: {
                type: sequelize.STRING,
                allowNull: true
            },
            grade: {
                type: sequelize.STRING,
                allowNull: true
            },
            path: {
                type: sequelize.JSON,
                allowNull: true
            },
            context: {
                type: sequelize.STRING,
                allowNull: true
            }
        });

        this.model = await model.sync({ alter: true });

        return this;
    }

    async getByVkId(vkUserId) {
        return await this.model.findOne({
            where: { vkUserId: vkUserId }
        });
    }
}

module.exports = User;