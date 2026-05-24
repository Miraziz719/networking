/**
 * SERVICE 2 — CRM / WMS Backend Service
 * BTEC Unit 6: Networking in the Cloud
 *
 * Simulates a combined Customer Relationship Management (CRM)
 * and Warehouse Management System (WMS) backend.
 * Exposes:
 *   GET /          -> main API response (load-balanced endpoint)
 *   GET /health    -> health check for Nginx upstream
 *   GET /metrics   -> Prometheus metrics scrape endpoint
 *   GET /api/crm   -> CRM business data (customers, leads, deals)
 *   GET /api/wms   -> WMS business data (warehouse, shipments)
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const client = require('prom-client');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3002;
const SERVICE_NAME = process.env.SERVICE_NAME || 'CRM-WMS-Service-2';
const SERVICE_COLOR = '#10b981'; // Green for CRM/WMS

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

// ─── CRM Mock Data Generator — Kiyim-kechak ulgurji mijozlar ─────────────────
function generateCRMData() {
  const stages = ['Murojaat', 'Tasdiq', 'Taklif yuborildi', 'Muzokaralar', 'Shartnoma tuzildi'];
  const reps = ['Aziz Karimov', 'Nodira Yusupova', 'Jasur Toshmatov', 'Malika Rahimova'];
  const customers = [
    'Korzinka Savdo Tarmog\'i',
    'Makro Supermarket',
    'Next Step Kiyim Do\'koni',
    'FashionHub Toshkent',
    'Style Center Samarqand',
  ];
  return {
    module: 'CRM',
    company: 'UzCloth Ulgurji MChJ',
    timestamp: new Date().toISOString(),
    pipeline: {
      totalLeads: Math.floor(Math.random() * 40) + 85,
      activeDeals: Math.floor(Math.random() * 15) + 28,
      closedThisMonth: Math.floor(Math.random() * 8) + 6,
      conversionRate: `${(Math.random() * 5 + 24).toFixed(1)}%`,
    },
    topDeals: [1, 2, 3].map(i => ({
      id: `BITIM-${1000 + i}`,
      customer: customers[i % customers.length],
      product: ['Ko\'ylaklar partiyasi', 'Shimlar to\'plami', 'Sport kiyimlar'][i - 1],
      value: `$${(Math.random() * 40000 + 15000).toFixed(0)}`,
      stage: stages[Math.floor(Math.random() * stages.length)],
      rep: reps[Math.floor(Math.random() * reps.length)],
    })),
  };
}

function generateWMSData() {
  const zones = [
    { name: 'A Zona — Erkaklar', category: 'Erkaklar kiyimi' },
    { name: 'B Zona — Ayollar', category: 'Ayollar kiyimi' },
    { name: 'C Zona — Bolalar', category: 'Bolalar kiyimi' },
    { name: 'D Zona — Sport', category: 'Sport va aktivwear' },
  ];
  return {
    module: 'WMS',
    company: 'UzCloth Ulgurji MChJ',
    timestamp: new Date().toISOString(),
    warehouse: {
      location: 'Toshkent Markaziy Ombor',
      totalCapacity: 12000,
      usedCapacity: Math.floor(Math.random() * 2500) + 7500,
      pendingPicklists: Math.floor(Math.random() * 12) + 4,
      shipmentsToday: Math.floor(Math.random() * 40) + 60,
    },
    zones: zones.map(z => ({
      zone: z.name,
      category: z.category,
      occupancy: `${(Math.random() * 20 + 60).toFixed(1)}%`,
      temperature: `${(Math.random() * 2 + 19).toFixed(1)}°C`,
      humidity: `${(Math.random() * 10 + 45).toFixed(0)}%`,
      status: Math.random() > 0.1 ? 'Faol' : 'Texnik xizmat',
    })),
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
    serviceType: 'CRM/WMS',
    message: '✅ CRM/WMS xizmati so\'rovingizni qayta ishladi',
    description: 'CRM — Mijozlar boshqaruvi + WMS — Kiyim-kechak ombori',
    requestId: uuidv4(),
    requestNumber: requestCount,
    hostname: os.hostname(),
    pid: process.pid,
    uptime: `${uptime}s`,
    timestamp: new Date().toISOString(),
    networkInfo: {
      subnet: 'private-subnet-10.0.3.0/24',
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

// CRM-specific API
app.get('/api/crm', (req, res) => {
  res.json({ service: SERVICE_NAME, ...generateCRMData() });
});

// WMS-specific API
app.get('/api/wms', (req, res) => {
  res.json({ service: SERVICE_NAME, ...generateWMSData() });
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
  console.log(`   CRM API: http://localhost:${PORT}/api/crm`);
  console.log(`   WMS API: http://localhost:${PORT}/api/wms\n`);
});

module.exports = app;
