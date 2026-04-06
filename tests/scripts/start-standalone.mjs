import { createWriteStream, existsSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const projectRoot = process.cwd()
const serverPath = path.join(projectRoot, '.next', 'standalone', 'server.js')
const logPath = path.join(projectRoot, 'server.log')

if (!existsSync(serverPath)) {
  console.error('Standalone server build not found. Run "npm run build" first.')
  process.exit(1)
}

const logStream = createWriteStream(logPath, { flags: 'w' })
const child = spawn(process.execPath, [serverPath], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NODE_ENV: 'production',
  },
  stdio: ['inherit', 'pipe', 'pipe'],
})

child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk)
  logStream.write(chunk)
})

child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk)
  logStream.write(chunk)
})

child.on('exit', (code) => {
  logStream.end()
  process.exit(code ?? 0)
})
