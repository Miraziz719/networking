/**
 * Service 1 — Basic smoke tests
 * Run: node src/index.test.js
 */
const http = require('http');

const PORT = process.env.PORT || 3001;
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
  console.log('🧪 Running Service 1 Tests...\n');

  // Test 1: Health check
  try {
    const { status, body } = await request('/health');
    const json = JSON.parse(body);
    if (status === 200 && json.status === 'healthy') {
      console.log('  ✅ PASS: /health returns 200 with status=healthy');
      passed++;
    } else {
      console.log(`  ❌ FAIL: /health returned status=${status}, body=${body}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL: /health threw error: ${e.message}`);
    failed++;
  }

  // Test 2: Root endpoint
  try {
    const { status, body } = await request('/');
    const json = JSON.parse(body);
    if (status === 200 && json.success && json.serviceType === 'ERP') {
      console.log('  ✅ PASS: / returns 200 with serviceType=ERP');
      passed++;
    } else {
      console.log(`  ❌ FAIL: / returned status=${status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL: / threw error: ${e.message}`);
    failed++;
  }

  // Test 3: ERP API
  try {
    const { status, body } = await request('/api/erp');
    const json = JSON.parse(body);
    if (status === 200 && json.module === 'ERP') {
      console.log('  ✅ PASS: /api/erp returns ERP data');
      passed++;
    } else {
      console.log(`  ❌ FAIL: /api/erp returned status=${status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL: /api/erp threw error: ${e.message}`);
    failed++;
  }

  // Test 4: Metrics endpoint
  try {
    const { status, body } = await request('/metrics');
    if (status === 200 && body.includes('http_requests_total')) {
      console.log('  ✅ PASS: /metrics returns Prometheus metrics');
      passed++;
    } else {
      console.log(`  ❌ FAIL: /metrics returned status=${status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL: /metrics threw error: ${e.message}`);
    failed++;
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// Start server and run tests
const app = require('./index');
setTimeout(runTests, 500);
