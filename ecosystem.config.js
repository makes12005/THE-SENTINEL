module.exports = {
  apps: [
    {
      name: "bus-alert-api",
      script: "apps/backend/dist/server.js",
      env_production: { NODE_ENV: "production" }
    },
    {
      name: "alert-worker", 
      script: "apps/backend/dist/workers/alert.worker.js",
      env_production: { NODE_ENV: "production" }
    },
    {
      name: "heartbeat-worker",
      script: "apps/backend/dist/workers/heartbeat.worker.js", 
      env_production: { NODE_ENV: "production" }
    }
  ]
}
