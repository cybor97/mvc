const { UnimplementedException } = require('../utils/Errors');

class IController {
    constructor() {
        this.authorizationRequired = false;
        this.checkAclRequired = false;
    }

    async init() {
        throw new UnimplementedException('IController.init unimplemented');
    }

    async authorize() {
        throw new UnimplementedException('IController.authorize unimplemented');
    }

    async checkAcl() {
        throw new UnimplementedException('IController.checkAcl unimplemented');
    }
}

module.exports = IController;