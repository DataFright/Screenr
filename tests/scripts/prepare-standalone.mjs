import { cp, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const standaloneRoot = path.join(projectRoot, '.next', 'standalone')
const standaloneNextRoot = path.join(standaloneRoot, '.next')
const staticSource = path.join(projectRoot, '.next', 'static')
const staticTarget = path.join(standaloneNextRoot, 'static')
const publicSource = path.join(projectRoot, 'public')
const publicTarget = path.join(standaloneRoot, 'public')
const swcHelpersSource = path.join(projectRoot, 'node_modules', '@swc', 'helpers')
const swcHelpersTarget = path.join(standaloneRoot, 'node_modules', '@swc', 'helpers')
const napiCanvasSource = path.join(projectRoot, 'node_modules', '@napi-rs', 'canvas')
const napiCanvasTarget = path.join(standaloneRoot, 'node_modules', '@napi-rs', 'canvas')
const napiCanvasLinuxSource = path.join(projectRoot, 'node_modules', '@napi-rs', 'canvas-linux-x64-gnu')
const napiCanvasLinuxTarget = path.join(standaloneRoot, 'node_modules', '@napi-rs', 'canvas-linux-x64-gnu')
const pdfParseSource = path.join(projectRoot, 'node_modules', 'pdf-parse')
const pdfParseTarget = path.join(standaloneRoot, 'node_modules', 'pdf-parse')
const pdfJsDistSource = path.join(projectRoot, 'node_modules', 'pdfjs-dist')
const pdfJsDistTarget = path.join(standaloneRoot, 'node_modules', 'pdfjs-dist')

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
await copyIfPresent(swcHelpersSource, swcHelpersTarget)
await copyIfPresent(napiCanvasSource, napiCanvasTarget)
await copyIfPresent(napiCanvasLinuxSource, napiCanvasLinuxTarget)
await copyIfPresent(pdfParseSource, pdfParseTarget)
await copyIfPresent(pdfJsDistSource, pdfJsDistTarget)
