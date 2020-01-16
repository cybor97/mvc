module.exports = {
  apps: [{
    name: 'API',
    script: 'app.js',
    args: '--api-server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  },
  {
    name: 'Workers',
    script: 'app.js',
    args: ['--workers'],
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
};