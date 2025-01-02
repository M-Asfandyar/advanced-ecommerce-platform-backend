const client = require('prom-client');

// Create a registry to register metrics
const register = new client.Registry();

// Default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
});

// Register the custom metric
register.registerMetric(httpRequestDuration);

module.exports = { register, httpRequestDuration };
