const IRoute = require('./IRoute');

class CRM extends IRoute {
    constructor() {
        super('CRMController', 'express');
    }

    init() {
        return {
            'GET:/crm/user': {
                call: 'getUsers'
            },
            'POST:/crm/user/fetch-data': {
                call: 'fetchAllUsersData'
            },
            'PUT:/crm/user/:id': {
                call: 'setUser'
            },
            'DELETE:/crm/user/:id': {
                call: 'removeUser'
            },

            'GET:/crm/book': {
                call: 'getBooks'
            },
            'POST:/crm/book': {
                call: 'addBook'
            },
            'PUT:/crm/book/:id': {
                call: 'setBook'
            },
            'DELETE:/crm/book/:id': {
                call: 'removeBook'
            },

            'GET:/crm/book/page/all': {
                call: 'getBookPagesAll',
            },

            'GET:/crm/book/:id/page': {
                call: 'getBookPages'
            },
            'POST:/crm/book/:bookId/page': {
                call: 'addBookPage'
            },
            'PUT:/crm/book/page/:id': {
                call: 'setBookPage'
            },
            'DELETE:/crm/book/page/:id': {
                call: 'removeBookPage'
            },

            'GET:/crm/phrase': {
                call: 'getPhrases'
            },
            'PUT:/crm/phrase/:key': {
                call: 'setPhrase'
            },
            'DELETE:/crm/phrase/:key': {
                call: 'removePhrase'
            },

        };
    }
}

module.exports = CRM;