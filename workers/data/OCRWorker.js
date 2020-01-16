const IWorker = require('../IWorker');

class ORCWorker extends IWorker {
    constructor() {
        super();
    }

    async init() {
        //Fetch pages by isParsed and process
    }
}

module.exports = ORCWorker;