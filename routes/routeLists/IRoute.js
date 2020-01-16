const express = require('express');
const IController = require('../../controllers/IController');
const { ValidationError } = require('../../utils/Errors');

class IRoute {
    constructor(controller, type) {
        this.routes = [];
        this.app = express();
        this.controller = controller;
        this.type = type;
    }

    init() {
        if (!this.controller instanceof IController) {
            throw new ValidationError('IRoute.init controller should be defined');
        }

        for (let route in this.routes) {
            this.app[route.method](route.url, method)
        }
    }
}

module.exports = IRoute;