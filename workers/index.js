const fs = require('fs');
const path = require('path');
const IWorker = require('./IWorker');

const config = require('../config');

//TODO: Review, should fail if worker uninitialized
class Workers {
    /**
     * Init workers
     * @param {Array<String>} workers Init and run only specific workers 
     */
    static async init(workers) {
        this.workers = {};

        let workersDirs = fs.readdirSync(__dirname)
            .map(c => path.join(__dirname, c))
            .filter(c => fs.statSync(c).isDirectory());

        for (let dir of workersDirs) {
            let workersFiles = fs.readdirSync(dir);
            for (let workerFile of workersFiles) {
                let workerName = workerFile.split('.js').shift();
                if (!workers || workers.includes(workerName)) {
                    let workerClass = require(path.join(dir, workerFile));
                    let workerInstance = new workerClass();
                    if (workerClass != 'IWorker' && workerInstance instanceof IWorker) {
                        this.workers[workerName] = await workerInstance.init();
                    }
                }
            }

        }
    }

    /**
     * Init workers
     * @param {Array<String>} workers Run only specific workers 
     */
    static async run(workers) {
        while (true) {
            for (let workerName of Object.keys(this.workers)) {
                if (!workers || workers.includes(workerName)) {
                    let workerObject = this.workers[workerName];
                    if (workerObject instanceof IWorker) {
                        await workerObject.doWork();
                        await new Promise(resolve => setTimeout(resolve, config.workers && config.workers[workerName] && config.workers[workerName].interval != null
                            ? config.workers[workerName].interval
                            : config.workers && config.workers.interval != null
                                ? config.workers.interval
                                : config.updateInterval
                                    ? config.updateInterval
                                    : 1000));
                    }
                }
            }
        }
    }
}

module.exports = Workers;