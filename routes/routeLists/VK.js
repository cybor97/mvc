const IRoute = require('./IRoute');

class VK extends IRoute {
    constructor() {
        super('VKAPIController', 'express');
    }

    init() {
        return {
            /**
             * @api {post} /vk/bot VK Callback API
             * @apiGroup SNS
             * @apiDescription Process VK callback
             * 
             * @apiParam {String} type Callback type
             * @apiParam {String} secret Secret
             * @apiParam {Object} object Callback data
             * 
             * @apiSuccess {String} ok
             */
            'POST:/vk/bot': {
                call: 'callback',
                controller: 'VKBotController'
            },

            /**
             * @api {post} /vk/oauth/fetch Fetch VK OAuth data
             * @apiGroup SNS
             * @apiDescription Fetch VK OAuth data
             * 
             * @apiSuccess {String} appId
             * @apiSuccess {String} scope
             * @apiSuccess {String} responseType 
             * @apiSuccess {String} version
             */
            'POST:/vk/ouath/fetch': {
                call: 'fetchOauth'
            },

            /**
             * @api {post} /vk/oauth/callback Process VK OAuth callback
             * @apiGroup SNS
             * @apiDescription Process VK OAuth callback
             * 
             * @apiParam {String} code
             * @apiParam {String} error
             * @apiParam {String} errorDescription
             * 
             * @apiSuccess {String} token
             */
            'POST:/vk/oauth/callback': {
                call: 'callbackOauth'
            }
        };
    }
}

module.exports = VK;