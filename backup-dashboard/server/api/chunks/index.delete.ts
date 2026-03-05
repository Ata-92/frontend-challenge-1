import type { DeleteResult, ChunksResponse } from '~/types'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export default defineEventHandler(async (event): Promise<DeleteResult> => {
  const body = await readBody<{ chunkIds: string[] }>(event)
  const { chunkIds } = body

  if (!chunkIds || !Array.isArray(chunkIds) || chunkIds.length === 0) {
    throw createError({ statusCode: 400, message: 'chunkIds array is required' })
  }

  // Load data to calculate freed space
  const dataPath = resolve(process.cwd(), 'mock-data/signedfiles.json')
  const data: ChunksResponse = JSON.parse(readFileSync(dataPath, 'utf-8'))
  const allChunks = data.groups.flatMap(g => g.chunks)

  const toDelete = allChunks.filter(c => chunkIds.includes(c.id))
  const freedBytes = toDelete.reduce((sum, c) => sum + c.sizeBytes, 0)

  // Simulate occasional failures (~2% of chunks fail)
  const failed = toDelete.filter(() => Math.random() < 0.02)
  const succeeded = toDelete.length - failed.length

  return {
    success: failed.length === 0,
    deletedCount: succeeded,
    failedCount: failed.length,
    freedBytes,
    errors: failed.map(c => `Failed to delete chunk ${c.id}: storage node unreachable`),
  }
})
