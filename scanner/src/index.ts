import { ComponentScanner } from './ComponentScanner.js'
import { ManifestWriter } from './ManifestWriter.js'

const [, , srcDir, outDir] = process.argv

if (!srcDir || !outDir) {
  console.error('Usage: scanner <srcDir> <outDir>')
  process.exit(1)
}

const scanner = new ComponentScanner()
const writer = new ManifestWriter()

const manifests = scanner.scan(srcDir)
writer.write(manifests, outDir)

console.log(`Scanned ${manifests.length} component(s) → ${outDir}/registry.json`)
