module.exports = {
  apps: [
    {
      name: "blogs-next",
      script: ".next/standalone/server.js",
      cwd: process.cwd(),
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: "8081",
      },
    },
  ],
};
