/**
 * SERVICE 1 — ERP Backend Service
 * BTEC Unit 6: Networking in the Cloud
 *
 * Simulates an Enterprise Resource Planning (ERP) backend.
 * Exposes:
 *   GET /          -> main API response (load-balanced endpoint)
 *   GET /health    -> health check for Nginx upstream
 *   GET /metrics   -> Prometheus metrics scrape endpoint
 *   GET /api/erp   -> ERP business data (orders, inventory, finance)
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const client = require('prom-client');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;
const SERVICE_NAME = process.env.SERVICE_NAME || 'ERP-Service-1';
const SERVICE_COLOR = '#3b82f6'; // Blue for ERP

// ─── Prometheus Metrics ────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['service'],
  registers: [register],
});

// ─── State ──────────────────────────────────────────────────────────────────
let requestCount = 0;
const startTime = Date.now();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path, service: SERVICE_NAME });
  activeConnections.inc({ service: SERVICE_NAME });
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode, service: SERVICE_NAME });
    activeConnections.dec({ service: SERVICE_NAME });
    end();
  });
  next();
});

// ─── ERP Mock Data Generator — Kiyim-kechak ulgurji kompaniyasi ──────────────
function generateERPData() {
  const orders = ['KK-2401', 'KK-2402', 'KK-2403', 'KK-2404'];
  const suppliers = [
    'FabricWorld Toshkent',
    'TextilePro Farg\'ona',
    'SilkRoad Materials',
    'CottonKing Andijon',
  ];
  const statuses = ['Kutilmoqda', 'Jarayonda', 'Yuborildi', 'Yetkazildi'];
  const products = [
    { name: 'Erkaklar ko\'ylagi', category: 'Erkaklar', unit: 'dona' },
    { name: 'Ayollar ko\'ylagi', category: 'Ayollar', unit: 'dona' },
    { name: 'Bolalar kombinzoni', category: 'Bolalar', unit: 'dona' },
    { name: 'Sport shim', category: 'Sport', unit: 'dona' },
  ];
  return {
    module: 'ERP',
    company: 'UzCloth Ulgurji MChJ',
    timestamp: new Date().toISOString(),
    orders: orders.map((id, i) => ({
      id,
      product: products[i % products.length].name,
      category: products[i % products.length].category,
      supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
      quantity: Math.floor(Math.random() * 500 + 100),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      value: `$${(Math.random() * 8000 + 1000).toFixed(2)}`,
    })),
    inventory: {
      totalSKUs: 3240,
      categories: { erkaklar: 1020, ayollar: 1350, bolalar: 620, sport: 250 },
      lowStock: Math.floor(Math.random() * 15),
      warehouseUtilization: `${(Math.random() * 20 + 65).toFixed(1)}%`,
    },
    finance: {
      monthlyRevenue: `$${(Math.random() * 80000 + 120000).toFixed(0)}`,
      outstandingInvoices: Math.floor(Math.random() * 25),
      cashFlow: 'Ijobiy',
    },
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Root / main load-balanced endpoint
app.get('/', (req, res) => {
  requestCount++;
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  res.json({
    success: true,
    service: SERVICE_NAME,
    serviceColor: SERVICE_COLOR,
    serviceType: 'ERP',
    message: '✅ ERP xizmati so\'rovingizni qayta ishladi',
    description: 'ERP — Buyurtmalar, To\'qimachilik inventari va Moliya',
    requestId: uuidv4(),
    requestNumber: requestCount,
    hostname: os.hostname(),
    pid: process.pid,
    uptime: `${uptime}s`,
    timestamp: new Date().toISOString(),
    networkInfo: {
      subnet: 'private-subnet-10.0.2.0/24',
      role: 'backend-tier',
      protocol: 'HTTP/1.1',
      loadBalancer: 'nginx-round-robin',
    },
  });
});

// Health check (used by Nginx upstream health checks)
app.get('/health', (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  res.status(200).json({
    status: 'healthy',
    service: SERVICE_NAME,
    uptime: `${uptime}s`,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// ERP-specific API endpoint
app.get('/api/erp', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    ...generateERPData(),
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 ${SERVICE_NAME} running on port ${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/health`);
  console.log(`   Metrics: http://localhost:${PORT}/metrics`);
  console.log(`   ERP API: http://localhost:${PORT}/api/erp\n`);
});

module.exports = app;
