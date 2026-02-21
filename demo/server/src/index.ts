import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { createReactAiRouter } from 'server'
import type { ComponentManifest } from '../../../core/src/types.js'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is required')

const { default: Anthropic } = await import('@anthropic-ai/sdk')
const { ReactAiSdk } = await import('../../../sdk/src/ReactAiSdk.js')

const raw = readFileSync('./core/src/generated/registry.json', 'utf-8')
const manifests: ComponentManifest[] = JSON.parse(raw)

const sdk = new ReactAiSdk(new Anthropic({ apiKey }))

const app = express()
app.use(cors())
app.use('/api', createReactAiRouter({ manifests, sdk }))

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
