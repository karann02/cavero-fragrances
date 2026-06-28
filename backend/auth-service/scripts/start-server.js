const { execFileSync, spawn } = require('child_process');
const path = require('path');

const PORT = Number(process.env.PORT || 5000);
const SERVER_PATH = path.join(__dirname, '..', 'server.js');

function runPowerShell(command) {
  return execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', command],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  ).trim();
}

function getListeningPid(port) {
  try {
    const output = runPowerShell(
      `$connection = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess; if ($connection) { $connection }`
    );
    const pid = Number(output);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch (error) {
    return null;
  }
}

function getProcessCommandLine(pid) {
  try {
    return runPowerShell(
      `$process = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction SilentlyContinue; if ($process) { $process.CommandLine }`
    );
  } catch (error) {
    return '';
  }
}

function stopProcess(pid) {
  try {
    runPowerShell(`Stop-Process -Id ${pid} -Force -ErrorAction Stop`);
    return true;
  } catch (error) {
    return false;
  }
}

function waitForPortToClear(port, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!getListeningPid(port)) {
      return true;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150);
  }
  return !getListeningPid(port);
}

function startServer() {
  const child = spawn(process.execPath, [SERVER_PATH], {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    stdio: 'inherit'
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });

  child.on('error', (error) => {
    console.error('[auth-service] Failed to start server:', error);
    process.exit(1);
  });
}

if (process.platform === 'win32') {
  const existingPid = getListeningPid(PORT);

  if (existingPid) {
    const commandLine = getProcessCommandLine(existingPid);
    const isNodeProcess = /node(\.exe)?/i.test(commandLine);

    if (isNodeProcess) {
      console.log(`[auth-service] Port ${PORT} is already in use by PID ${existingPid}. Stopping the previous Node process and restarting...`);
      const stopped = stopProcess(existingPid);

      if (!stopped || !waitForPortToClear(PORT)) {
        console.error(`[auth-service] Could not free port ${PORT}. Please stop the existing process manually and try again.`);
        process.exit(1);
      }
    } else {
      console.error(`[auth-service] Port ${PORT} is already in use by a non-Node process (PID ${existingPid}). Please free the port and try again.`);
      process.exit(1);
    }
  }
}

startServer();
