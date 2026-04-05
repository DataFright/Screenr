import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')
const performanceRoot = path.join(projectRoot, 'tests', 'fixtures', 'performance')
const templatePath = path.join(projectRoot, 'tests', 'fixtures', 'valid_resume.pdf')

const fixtureGroups = [
  {
    directoryName: '1mb',
    sizeBytes: 1 * 1024 * 1024,
    count: 10,
  },
]

function buildPdfCommentPadding(length, label) {
  const chunks = []
  let remaining = length
  let sequence = 1

  while (remaining > 0) {
    const prefix = `% Screenr performance padding ${label} #${String(sequence).padStart(3, '0')} `
    const prefixBuffer = Buffer.from(prefix, 'ascii')

    if (remaining <= prefixBuffer.length) {
      chunks.push(prefixBuffer.subarray(0, remaining))
      break
    }

    const newlineLength = remaining > prefixBuffer.length + 1 ? 1 : 0
    const fillLength = Math.max(0, remaining - prefixBuffer.length - newlineLength)
    const fillBuffer = Buffer.alloc(fillLength, 0x58)

    chunks.push(prefixBuffer)
    if (fillLength > 0) {
      chunks.push(fillBuffer)
    }
    if (newlineLength === 1) {
      chunks.push(Buffer.from('\n'))
    }

    remaining -= prefixBuffer.length + fillLength + newlineLength
    sequence += 1
  }

  return Buffer.concat(chunks)
}

async function clearDirectory(directoryPath) {
  await mkdir(directoryPath, { recursive: true })
  const existingEntries = await readdir(directoryPath, { withFileTypes: true })

  await Promise.all(existingEntries.map((entry) => rm(path.join(directoryPath, entry.name), { recursive: true, force: true })))
}

async function createSizedPdf(outputPath, targetSizeBytes, label, templateBuffer) {
  const eofMarker = Buffer.from('%%EOF')
  const eofIndex = templateBuffer.lastIndexOf(eofMarker)

  if (eofIndex === -1) {
    throw new Error('Template PDF does not contain an EOF marker')
  }

  const prefix = templateBuffer.subarray(0, eofIndex)
  const suffix = templateBuffer.subarray(eofIndex)
  const paddingLength = targetSizeBytes - prefix.length - suffix.length

  if (paddingLength <= 0) {
    throw new Error(`Target size ${targetSizeBytes} is smaller than template size ${templateBuffer.length}`)
  }

  const padding = buildPdfCommentPadding(paddingLength, label)
  const outputBuffer = Buffer.concat([prefix, padding, suffix])

  if (outputBuffer.length !== targetSizeBytes) {
    throw new Error(`Generated PDF size mismatch for ${label}: expected ${targetSizeBytes}, got ${outputBuffer.length}`)
  }

  await writeFile(outputPath, outputBuffer)
}

async function main() {
  const templateBuffer = await readFile(templatePath)
  await mkdir(performanceRoot, { recursive: true })
  await rm(path.join(performanceRoot, '10mb'), { recursive: true, force: true })

  for (const group of fixtureGroups) {
    const directoryPath = path.join(performanceRoot, group.directoryName)
    await clearDirectory(directoryPath)

    for (let index = 1; index <= group.count; index += 1) {
      const fileName = `resume-${String(index).padStart(2, '0')}.pdf`
      await createSizedPdf(
        path.join(directoryPath, fileName),
        group.sizeBytes,
        `${group.directoryName}-${fileName}`,
        templateBuffer
      )
    }
  }

  console.log(`Generated performance fixtures in ${performanceRoot}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})