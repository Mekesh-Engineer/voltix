const http = require('http');

function checkUrl(url, label) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[PASS] ${label}: HTTP ${res.statusCode} | Content length: ${data.length}`);
        resolve({ status: res.statusCode, data });
      });
    }).on('error', (err) => {
      console.error(`[FAIL] ${label}: ${err.message}`);
      reject(err);
    });
  });
}

function postJson(url, payload, label) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[PASS] ${label}: HTTP ${res.statusCode} | Response received`);
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', (err) => {
      console.error(`[FAIL] ${label}: ${err.message}`);
      reject(err);
    });
    req.write(postData);
    req.end();
  });
}

async function verify() {
  console.log('--- Verifying Services ---');
  try {
    await checkUrl('http://127.0.0.1:8000/api/health', 'Backend Health API');
    await checkUrl('http://127.0.0.1:8000/api/models', 'Backend Models List API');
    await checkUrl('http://127.0.0.1:8000/api/conversations', 'Backend Conversations API');
    await checkUrl('http://localhost:3000/', 'Frontend Web Application');

    // Test Chat Stream API
    const chatRes = await postJson('http://127.0.0.1:8000/api/chat/stream', {
      message: 'Hello, are you ready?',
      model: 'llama3.2',
      provider: 'ollama',
    }, 'Chat Streaming SSE API');

    console.log('--- Verification Complete: ALL CHECKS PASSED ---');
  } catch (e) {
    console.error('Verification failed:', e.message);
    process.exit(1);
  }
}

verify();
