const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

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
  pythonPath = isWindows ? 'python' : 'python3';
}

console.log(`Starting FastAPI backend with ${pythonPath}...`);

const child = spawn(
  pythonPath,
  ['-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'],
  {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    shell: false,
  }
);

child.on('exit', (code) => process.exit(code || 0));
