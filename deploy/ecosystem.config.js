// PM2 Ecosystem Configuration — Catalyser Platform
// Usage: pm2 start deploy/ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'catalyser-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Restart policies
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/catapp/api-error.log',
      out_file: '/var/log/catapp/api-out.log',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Watch (disabled in production)
      watch: false,
    },
    {
      name: 'catalyser-web',
      cwd: './apps/web',
      script: 'node_modules/.bin/next',
      args: 'start --port 3000',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Restart policies
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/catapp/web-error.log',
      out_file: '/var/log/catapp/web-out.log',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      watch: false,
    },
  ],
};
