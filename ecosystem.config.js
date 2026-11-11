module.exports = {
  apps: [
    {
      name: 'inventaris-nh',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        BASE_PATH: '/inventaris-nh',
        NEXT_PUBLIC_BASE_PATH: '/inventaris-nh',
        APP_URL: 'https://dashboard.narasumberhukum.com/inventaris-nh',
        COOKIE_SECURE: 'true',
      },
    },
  ],
};
