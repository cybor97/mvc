const sequelize = require('sequelize');
const IDataModel = require('./IDataModel');

class Book extends IDataModel {
    async init() {
        let model = this.connection.define('book', {
            id: {
                type: sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true
            },
            dataSourceId: {
                type: sequelize.INTEGER,
                allowNull: false
            },
            url: {
                type: sequelize.STRING,
                allowNull: false,
            },
            logoUrl: {
                type: sequelize.STRING,
                allowNull: true,
            },
            classNumber: {
                type: sequelize.INTEGER,
                allowNull: false
            },
            name: {
                type: sequelize.STRING,
                allowNull: false,
                validate: {
                    notEmpty: true
                }
            },
            subject: {
                type: sequelize.STRING,
                allowNull: true,
                validate: {
                    notEmpty: true
                }
            },
            author: {
                type: sequelize.STRING,
                allowNull: true,
                validate: {
                    notEmpty: true
                }
            },
            description: {
                type: sequelize.TEXT,
                allowNull: true
            },
            keywords: {
                type: sequelize.TEXT,
                allowNull: true
            },

            isParsed: {
                type: sequelize.BOOLEAN,
                allowNull: false,
            },
            needsReview: {
                type: sequelize.BOOLEAN,
                defaultValue: false
            },
            isHidden: {
                type: sequelize.BOOLEAN,
                defaultValue: false
            }
        });

        this.model = await model.sync({ alter: true });

        return this;
    }

    async getBooksInfoConsolidated() {
        let query = `SELECT books.name, books.isParsed, count(bookPages.id) AS pagesCount 
        FROM books 
        LEFT JOIN bookPages ON bookPages.bookId = books.id 
        WHERE NOT books.isHidden
        GROUP BY books.id;`;

        return (await this.connection.query(query)).shift()
    }

    async getClassNumbers() {
        let query = 'SELECT DISTINCT(books.classNumber) AS classNumber FROM books WHERE NOT books.isHidden ORDER BY books.classNumber ASC;';

        return (await this.connection.query(query)).shift().map(c => c.classNumber);
    }

    async checkClass(classNumber) {
        let query = 'SELECT COUNT(books.id) AS booksCount FROM books WHERE classNumber = :classNumber AND NOT books.isHidden;';

        return !!parseInt((await this.connection.query(query, { replacements: { classNumber: classNumber } })).shift().pop().booksCount);
    }

    async getSubjects(classNumber) {
        let query = 'SELECT DISTINCT(books.subject) AS subject FROM books WHERE classNumber = :classNumber AND NOT books.isHidden ORDER BY books.subject ASC;';

        return (await this.connection.query(query, { replacements: { classNumber: classNumber } })).shift().map(c => c.subject);
    }

    async checkSubject(classNumber, subject) {
        let query = 'SELECT COUNT(books.id) AS booksCount FROM books WHERE classNumber = :classNumber AND subject = :subject AND NOT books.isHidden;';

        return !!parseInt((await this.connection.query(query, { replacements: { classNumber: classNumber, subject: subject } })).shift().pop().booksCount);
    }

    async getBooks(classNumber, subject) {
        let query = 'SELECT books.name FROM books WHERE classNumber = :classNumber AND subject = :subject AND NOT books.isHidden ORDER BY books.name ASC;';

        return (await this.connection.query(query, { replacements: { classNumber: classNumber, subject: subject } })).shift().map(c => c.name);
    }

    async getBook(classNumber, subject, name) {
        return await this.model.findOne({
            where: {
                classNumber: classNumber,
                subject: subject,
                name: { [sequelize.Op.like]: `${name}%` },
                isHidden: { [sequelize.Op.not]: true }
            }
        });
    }
}

module.exports = Book;