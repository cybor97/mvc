const { UnimplementedException } = require('../utils/Errors');

class IWorker {
    /**
     * Init IWorker
     * 
     * @returns {Promise<IWorker>}
     */
    async init() {
        throw new UnimplementedException('IWorker.init unimplemented');
    }

    /**
     * Do work
     * 
     * @returns {Promise<IWorker>}
     */
    async doWork() {
        throw new UnimplementedException('IWorker.doWork unimplemented');
    }
}

module.exports = IWorker;