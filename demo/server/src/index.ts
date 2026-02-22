import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createReactAiRouter, ReactAiSdk } from '@bnbarak/reactai/server'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is required')

const sdk = new ReactAiSdk(new Anthropic({ apiKey }))

const app = express()
app.use(cors())
app.use('/api', createReactAiRouter({
  registryPath: './core/src/generated/registry.json',
  sdk,
}))

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
