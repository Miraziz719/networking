const http = require('http');

const PORT = process.env.PORT || 3002;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

function request(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('\n=== CRM/WMS Service Tests ===\n');

  try {
    const health = await request('/health');
    assert(health.status === 200, 'GET /health returns 200');
    const body = JSON.parse(health.body);
    assert(body.status === 'healthy', '/health returns status: healthy');
  } catch (e) {
    console.error('Health check failed:', e.message);
    failed++;
  }

  try {
    const crm = await request('/api/crm');
    assert(crm.status === 200, 'GET /api/crm returns 200');
    const body = JSON.parse(crm.body);
    assert(typeof body.service === 'string', '/api/crm returns service field');
  } catch (e) {
    console.error('CRM endpoint failed:', e.message);
    failed++;
  }

  try {
    const wms = await request('/api/wms');
    assert(wms.status === 200, 'GET /api/wms returns 200');
    const body = JSON.parse(wms.body);
    assert(typeof body.service === 'string', '/api/wms returns service field');
  } catch (e) {
    console.error('WMS endpoint failed:', e.message);
    failed++;
  }

  try {
    const metrics = await request('/metrics');
    assert(metrics.status === 200, 'GET /metrics returns 200');
  } catch (e) {
    console.error('Metrics endpoint failed:', e.message);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
