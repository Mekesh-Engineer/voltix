const path = require('path');
const fs = require('fs');
const http = require('http');
const { concurrently } = require('concurrently');

const ROOT_DIR = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

// 1. Locate Python in root .venv (or backend/.venv fallback)
const rootVenvWin = path.join(ROOT_DIR, '.venv', 'Scripts', 'python.exe');
const rootVenvUnix = path.join(ROOT_DIR, '.venv', 'bin', 'python');
const backendVenvWin = path.join(ROOT_DIR, 'backend', '.venv', 'Scripts', 'python.exe');
const backendVenvUnix = path.join(ROOT_DIR, 'backend', '.venv', 'bin', 'python');

let pythonPath;
if (isWindows && fs.existsSync(rootVenvWin)) {
  pythonPath = rootVenvWin;
} else if (!isWindows && fs.existsSync(rootVenvUnix)) {
  pythonPath = rootVenvUnix;
} else if (isWindows && fs.existsSync(backendVenvWin)) {
  pythonPath = backendVenvWin;
} else if (!isWindows && fs.existsSync(backendVenvUnix)) {
  pythonPath = backendVenvUnix;
} else if (fs.existsSync(rootVenvWin)) {
  pythonPath = rootVenvWin;
} else if (fs.existsSync(rootVenvUnix)) {
  pythonPath = rootVenvUnix;
} else {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️  Warning: root .venv not detected. Falling back to system python.');
  pythonPath = isWindows ? 'python' : 'python3';
}

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[36m%s\x1b[0m', '   AI Chat Platform - Full Stack Development Dev   ');
console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log(`• Project Root: ${ROOT_DIR}`);
console.log(`• Python Venv:  ${pythonPath}`);
console.log(`• Frontend Dir: ${path.join(ROOT_DIR, 'frontend')}`);
console.log('');

// Helper to check Ollama on an endpoint
const pingOllamaUrl = (url, timeoutMs = 3500) => {
  return new Promise((resolve) => {
    try {
      const req = http.get(url, { timeout: timeoutMs }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
};

const checkOllama = async () => {
  // Check 127.0.0.1 first (fastest on Windows), then localhost
  if (await pingOllamaUrl('http://127.0.0.1:11434/api/tags')) {
    return { running: true, url: 'http://127.0.0.1:11434' };
  }
  if (await pingOllamaUrl('http://localhost:11434/api/tags')) {
    return { running: true, url: 'http://localhost:11434' };
  }

  // If not running, attempt to auto-launch ollama serve if available
  try {
    const hasOllama = isWindows
      ? execSync('where ollama', { stdio: 'pipe' }).toString().trim()
      : execSync('which ollama', { stdio: 'pipe' }).toString().trim();

    if (hasOllama) {
      console.log('\x1b[36m%s\x1b[0m', '⚡ Launching local Ollama daemon (ollama serve)...');
      const { spawn } = require('child_process');
      const proc = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      proc.unref();

      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 600));
        if (await pingOllamaUrl('http://127.0.0.1:11434/api/tags', 1000)) {
          return { running: true, url: 'http://127.0.0.1:11434', autoStarted: true };
        }
      }
    }
  } catch (err) {
    // ignore
  }

  return { running: false };
};

// Ensure ports 3000 and 8000 are freed from orphaned processes before starting
const { execSync } = require('child_process');
function freePort(port) {
  try {
    if (isWindows) {
      const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes(`:${port}`) && line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== process.pid.toString()) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
              console.log('\x1b[33m%s\x1b[0m', `✓ Automatically released port ${port} (PID ${pid})`);
            } catch (e) {
              // ignore
            }
          }
        }
      }
    } else {
      execSync(`fuser -k ${port}/tcp >/dev/null 2>&1 || true`);
    }
  } catch (err) {
    // ignore
  }
}

freePort(3000);
freePort(8000);

checkOllama().then((res) => {
  if (res.running) {
    if (res.autoStarted) {
      console.log('\x1b[32m%s\x1b[0m', `✓ Ollama service automatically started and verified on ${res.url}`);
    } else {
      console.log('\x1b[32m%s\x1b[0m', `✓ Ollama service detected and active on ${res.url}`);
    }
  } else {
    console.log('\x1b[33m%s\x1b[0m', 'ℹ  Ollama service not detected. Run `ollama serve` in a terminal or install from https://ollama.com');
  }
  console.log('');
});

// Define commands
// Note: Quote python path to handle spaces in directory paths safely
const backendCommand = `"${pythonPath}" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload`;
const frontendRunner = path.join(ROOT_DIR, 'frontend', 'next-runner.js');
const frontendCommand = `node "${frontendRunner}" dev -p 3000`;

const { result, commands } = concurrently(
  [
    {
      command: backendCommand,
      name: 'BACKEND',
      prefixColor: 'cyan.bold',
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    },
    {
      command: frontendCommand,
      name: 'FRONTEND',
      prefixColor: 'magenta.bold',
      cwd: path.join(ROOT_DIR, 'frontend'),
      env: {
        ...process.env,
        PORT: '3000',
      },
    },
  ],
  {
    prefix: '[{name}]',
    killOthersOn: ['failure', 'success'],
    restartTries: 0,
    cwd: ROOT_DIR,
  }
);

// Graceful cleanup on termination signals
const cleanExit = () => {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down all development services cleanly...');
  commands.forEach((cmd) => {
    try {
      cmd.kill();
    } catch (e) {
      // ignore
    }
  });
  process.exit(0);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);

result.then(
  () => {
    console.log('All processes finished.');
    process.exit(0);
  },
  (err) => {
    cleanExit();
  }
);
