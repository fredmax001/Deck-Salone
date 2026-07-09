module.exports = {
  apps: [
    {
      name: 'deck-salone-api',
      script: './api/src/index.js',
      cwd: '/Users/djfredmax/deck-salone',
      env: {
        NODE_ENV: 'production',
        PORT: 5002,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
