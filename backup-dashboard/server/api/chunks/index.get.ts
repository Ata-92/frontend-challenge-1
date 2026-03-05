import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { ChunksResponse } from '~/types'

export default defineEventHandler((): ChunksResponse => {
  const dataPath = resolve(process.cwd(), 'mock-data/signedfiles.json')
  const raw = readFileSync(dataPath, 'utf-8')
  return JSON.parse(raw)
})
