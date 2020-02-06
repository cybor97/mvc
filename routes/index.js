const fs = require('fs');
const path = require('path');
const express = require('express');
const IRoute = require('./routeLists/IRoute');
const IController = require('../controllers/IController');
const Logger = require('../utils/Logger');
const { ValidationError } = require('../utils/Errors');

require('../utils/expressAsyncErrors');

const PATH_ROUTES = './routeLists';
const PATH_CONTROLLERS = '../controllers'

class Routes {
    static async init() {
        this.express = express()
            .use(express.urlencoded({ extended: true, inflate: true }))
            .use(express.json())
            .use((req, res, next) => {
                if (req.method.toLowerCase() === 'options') {
                    res.status(200).send();
                }
                else {
                    next();
                }
            })
            .use('/doc', express.static(path.join(__dirname, '../doc')));

        this.methods = {};

        const routesPath = path.join(__dirname, PATH_ROUTES);
        let routes = fs.readdirSync(routesPath);
        for (let route of routes) {
            if (route != 'IRoute.js') {
                let routeInstance = new (require(path.join(routesPath, route)))();
                if (routeInstance instanceof IRoute) {
                    let routeRecords = await routeInstance.init();
                    for (let routeUrl in routeRecords) {
                        let routeRecord = routeRecords[routeUrl];
                        this.methods[`${routeRecord.controller || routeInstance.controller}.${routeRecord.call}`] = Object.assign(routeRecord, {
                            path: routeUrl,
                            type: routeRecord.type || routeInstance.type
                        });
                    }
                }
                else {
                    Logger.warn(`Invalid route ${route}`, routeInstance);
                }
            }
        }

        const controllersPath = path.join(__dirname, PATH_CONTROLLERS);
        let controllers = fs.readdirSync(controllersPath);
        for (let controller of controllers) {
            if (controller != 'IController.js') {
                let controllerClass = require(path.join(controllersPath, controller));
                let controllerInstance = new controllerClass();
                if (controllerInstance instanceof IController) {
                    await controllerInstance.init();
                    let controllerName = controller.split('.js').shift();
                    let methods = Object.getOwnPropertyNames(controllerClass.prototype);
                    for (let methodName of methods) {
                        let method = controllerInstance[methodName];
                        if (typeof (method) === 'function' && !['constructor', 'init'].includes(methodName)) {
                            let routeRecord = this.methods[`${controllerName}.${methodName}`];
                            if (routeRecord) {
                                routeRecord.run = method.bind(controllerInstance);
                                routeRecord.authorizationRequired = controllerInstance.authorizationRequired;
                                routeRecord.checkAclRequired = controllerInstance.checkAclRequired;
                                routeRecord.authorize = controllerInstance.authorize.bind(controllerInstance);
                                routeRecord.checkAcl = controllerInstance.checkAcl.bind(controllerInstance);
                            }
                        }
                    }
                }
                else {
                    Logger.warn(`Invalid controller ${controller}`, controllerInstance);
                }
            }
        }

        for (let methodName of Object.keys(this.methods)) {
            let methodRecord = this.methods[methodName];
            if (methodRecord.type === 'express') {
                let httpMethod = methodRecord.path.split(':').shift();
                let urlPart = methodRecord.path.split(new RegExp(`^${httpMethod}:`)).pop();

                if (typeof (methodRecord.run) === 'function') {
                    this.express[httpMethod.toLowerCase()](urlPart, async (req, res) => {
                        let authorizationData = {};
                        if (methodRecord.authorizationRequired) {
                            authorizationData = await methodRecord.authorize(req.headers);

                            if (!authorizationData) {
                                return res.status(401).send({ status: 401, data: 'Unauthorized!' });
                            }
                        }
                        if (authorizationData && methodRecord.checkAclRequired) {
                            let checkAclData = await methodRecord.checkAcl(authorizationData);
                            if (!checkAclData) {
                                return await res.status(403).send({ status: 403, data: 'Access denied!' });
                            }

                            authorizationData = Object.assign(authorizationData, { user: checkAclData })
                        }

                        let resp = await methodRecord.run(Object.assign({}, req.query, req.body, req.params, req.headers), authorizationData);
                        res.status(resp.status || 200).send(resp.dataOnly ? resp.data : resp);
                    });
                }
                else {
                    this.express[httpMethod.toLowerCase()](urlPart, (req, res) => res.status(500).send({ status: 500, data: 'Route unimplemented!' }));
                    Logger.err(`Method ${methodName} controller function is not found!`);
                }
            }
            else {
                Logger.warn(`Method ${methodName} type ${methodRecord.type} is unsupported!`);
            }
        }

        this.express.use(async (err, req, res, next) => {
            Logger.err(err);
            if (err instanceof ValidationError) {
                return res.status(400).send({ message: err.message });
            }

            return res.status(500).send({
                message: err.message,
                stack: err.stack
            });
        });

        this.express.use((req, res, next) => { res.send({ status: 404, data: 'Route not found!' }) });

        this.express.listen(8100);
    }
}

module.exports = Routes;