/**
 * @fileoverview Standalone Server Launcher
 *
 * Starts the Next.js standalone server bundle produced by `next build` and
 * mirrors stdout/stderr to server.log for easier debugging in local/Docker
 * production-style runs.
 */

import { createWriteStream, existsSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const projectRoot = process.cwd()
const serverPath = path.join(projectRoot, '.next', 'standalone', 'server.js')
const logPath = path.join(projectRoot, 'server.log')

// Guard clause with actionable instruction when build artifacts are missing.
if (!existsSync(serverPath)) {
  console.error('Standalone server build not found. Run "npm run build" first.')
  process.exit(1)
}

// Overwrite log file each run so it reflects current startup/session behavior.
const logStream = createWriteStream(logPath, { flags: 'w' })

// Spawn Node directly to run the standalone server entrypoint.
const child = spawn(process.execPath, [serverPath], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NODE_ENV: 'production',
  },
  stdio: ['inherit', 'pipe', 'pipe'],
})

// Mirror child process output both to terminal and log file.
child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk)
  logStream.write(chunk)
})

child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk)
  logStream.write(chunk)
})

// Propagate child exit code so CI/scripts fail when server startup fails.
child.on('exit', (code) => {
  logStream.end()
  process.exit(code ?? 0)
})
