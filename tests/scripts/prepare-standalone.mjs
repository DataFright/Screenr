import { cp, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const standaloneRoot = path.join(projectRoot, '.next', 'standalone')
const standaloneNextRoot = path.join(standaloneRoot, '.next')
const staticSource = path.join(projectRoot, '.next', 'static')
const staticTarget = path.join(standaloneNextRoot, 'static')
const publicSource = path.join(projectRoot, 'public')
const publicTarget = path.join(standaloneRoot, 'public')

async function copyIfPresent(sourcePath, targetPath) {
  try {
    await stat(sourcePath)
  } catch {
    return
  }

  await mkdir(path.dirname(targetPath), { recursive: true })
  await cp(sourcePath, targetPath, { recursive: true, force: true })
}

await copyIfPresent(staticSource, staticTarget)
await copyIfPresent(publicSource, publicTarget)
