/**
 * Service 2 — Basic smoke tests
 * Run: node src/index.test.js
 */
const http = require('http');

const PORT = process.env.PORT || 3002;
let passed = 0;
let failed = 0;

function request(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('🧪 Running Service 2 Tests...\n');

  const tests = [
    { path: '/health', check: (s, b) => s === 200 && JSON.parse(b).status === 'healthy', desc: '/health returns 200 with status=healthy' },
    { path: '/', check: (s, b) => s === 200 && JSON.parse(b).serviceType === 'CRM/WMS', desc: '/ returns 200 with serviceType=CRM/WMS' },
    { path: '/api/crm', check: (s, b) => s === 200 && JSON.parse(b).module === 'CRM', desc: '/api/crm returns CRM data' },
    { path: '/api/wms', check: (s, b) => s === 200 && JSON.parse(b).module === 'WMS', desc: '/api/wms returns WMS data' },
    { path: '/metrics', check: (s, b) => s === 200 && b.includes('http_requests_total'), desc: '/metrics returns Prometheus metrics' },
  ];

  for (const t of tests) {
    try {
      const { status, body } = await request(t.path);
      if (t.check(status, body)) {
        console.log(`  ✅ PASS: ${t.desc}`);
        passed++;
      } else {
        console.log(`  ❌ FAIL: ${t.desc} (status=${status})`);
        failed++;
      }
    } catch (e) {
      console.log(`  ❌ FAIL: ${t.desc} — ${e.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const app = require('./index');
setTimeout(runTests, 500);
