const Sequelize = require('sequelize').Sequelize;
const { UnimplementedException, ValidationError } = require('../../utils/Errors');

class IDataModel {
    constructor(connection) {
        if (!(connection instanceof Sequelize)) {
            throw new ValidationError('IDataModel.constructor connections should be instance of Sequelize');
        }

        this.connection = connection;
    }

    init() {
        throw new UnimplementedException('IDataModel.init unimplemented');
    }
}

module.exports = IDataModel;