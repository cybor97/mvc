const sequelize = require('sequelize');
const { ValidationError } = require('../../utils/Errors');
const IDataModel = require('./IDataModel');

class BookPage extends IDataModel {
    async init() {
        let model = this.connection.define('bookPage', {
            id: {
                type: sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true
            },
            bookId: {
                type: sequelize.INTEGER,
                allowNull: false
            },
            url: {
                type: sequelize.STRING,
                allowNull: false
            },
            bookPart: {
                type: sequelize.STRING,
                allowNull: true
            },
            page: {
                type: sequelize.STRING,
                allowNull: true
            },
            paragraph: {
                type: sequelize.STRING,
                allowNull: true
            },
            sectionRoot: {
                type: sequelize.STRING,
                allowNull: true
            },
            section: {
                type: sequelize.STRING,
                allowNull: true
            },

            textData: {
                type: sequelize.TEXT,
                allowNull: true
            },
            textDataKeywords: {
                type: sequelize.TEXT,
                allowNull: true
            },
            imageUrl: {
                type: sequelize.STRING,
                allowNull: true
            },

            isParsed: {
                type: sequelize.BOOLEAN,
                allowNull: false,
            },
            needsReview: {
                type: sequelize.BOOLEAN,
                defaultValue: false
            }
        });

        this.model = await model.sync({ alter: true });

        return this;
    }

    async getPartValues(bookId, part) {
        let query = `SELECT DISTINCT ${part} AS ${part} FROM bookPages WHERE bookId = :bookId`;

        return await (await this.connection.query(query, { replacements: { bookId: bookId }, raw: true })).shift().map(c => c[part]);
    }

    async getBookPagesInfo(bookId) {
        let query = `
        SELECT COUNT(DISTINCT bookPart) bookPartsCount, COUNT(DISTINCT paragraph) paragraphsCount, COUNT(DISTINCT sectionRoot) sectionRootsCount, COUNT(DISTINCT section) AS sectionsCount, COUNT(DISTINCT page) AS pagesCount 
        FROM bookPages 
        WHERE bookId = :bookId;
        `;

        return await (await this.connection.query(query, { replacements: { bookId: bookId }, raw: true })).shift().pop();
    }

    async getRange(bookId, param) {
        if (!param.match(/[a-zA-Z0-9_]*/)) {
            throw new ValidationError('param should match "[a-zA-Z0-9_]*" !');
        }

        let from = (await this.connection.query(`SELECT \`${param}\` FROM bookPages WHERE bookId = :bookId ORDER BY LENGTH(\`${param}\`) ASC, \`${param}\` ASC LIMIT 1`, { replacements: { bookId } })).shift().pop()[param];
        let to = (await this.connection.query(`SELECT \`${param}\` FROM bookPages WHERE bookId = :bookId ORDER BY LENGTH(\`${param}\`) DESC, \`${param}\` DESC LIMIT 1`, { replacements: { bookId } })).shift().pop()[param];

        return { from, to };
    }

    async getByPage(bookId, pageNumber) {
        return await this.model.findOne({
            where: {
                bookId: bookId,
                page: pageNumber
            }
        });
    }

    async getByPart(bookId, part, value) {
        return await this.model.findOne({
            where: {
                bookId: bookId,
                [part]: value
            }
        });
    }

    async getByPath(bookId, path) {
        return await this.model.findOne({
            where: {
                bookId: bookId,
                ...path
            }
        });

    }
}

module.exports = BookPage;