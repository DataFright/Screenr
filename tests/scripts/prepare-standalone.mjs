/**
 * @fileoverview Standalone Build Post-Processing
 *
 * Next.js standalone output does not always include every runtime asset this
 * project relies on (especially PDF parsing/runtime native dependencies).
 * This script copies required assets/packages into .next/standalone so the
 * production-style server can run consistently in Docker and local standalone.
 */

import { cp, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'

// Resolve all paths from repository root so this works in CI and local runs.
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

/**
 * Copies sourcePath to targetPath only when source exists.
 *
 * Some optional dependencies may not be present in every environment, so this
 * helper avoids hard failures for missing paths while still copying everything
 * available for runtime parity.
 */
async function copyIfPresent(sourcePath, targetPath) {
  try {
    await stat(sourcePath)
  } catch {
    return
  }

  await mkdir(path.dirname(targetPath), { recursive: true })
  await cp(sourcePath, targetPath, { recursive: true, force: true })
}

// Public/static assets and runtime packages required by the standalone server.
await copyIfPresent(staticSource, staticTarget)
await copyIfPresent(publicSource, publicTarget)
await copyIfPresent(swcHelpersSource, swcHelpersTarget)
await copyIfPresent(napiCanvasSource, napiCanvasTarget)
await copyIfPresent(napiCanvasLinuxSource, napiCanvasLinuxTarget)
await copyIfPresent(pdfParseSource, pdfParseTarget)
await copyIfPresent(pdfJsDistSource, pdfJsDistTarget)
