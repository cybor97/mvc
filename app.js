const pm2IOMonit = require('@pm2/io');

const DBConnection = require('./data');
const Workers = require('./workers');
const Routes = require('./routes');

async function init(modes) {
    pm2IOMonit.init({
        transactions: true,
        http: true
    });

    await DBConnection.init();
    if (modes.includes('--workers')) {
        await Workers.init();
        Workers.run();
    }
    if (modes.includes('--api-server')) {
        await Routes.init();
    }

};

let modes = process.argv.slice(2).filter(c => c.startsWith('--'));
init(modes && modes.length ? modes : ['--api-server', '--workers']);