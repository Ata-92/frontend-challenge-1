import { readFileSync } from 'fs'
import { resolve } from 'path'
import { randomBytes } from 'crypto'
import type { DownloadUrlsResponse, ChunksResponse } from '~/types'

export default defineEventHandler(async (event): Promise<DownloadUrlsResponse> => {
  const body = await readBody<{ chunkIds: string[] }>(event)
  const { chunkIds } = body

  if (!chunkIds || !Array.isArray(chunkIds) || chunkIds.length === 0) {
    throw createError({ statusCode: 400, message: 'chunkIds array is required' })
  }

  // Load all chunks to find the requested ones
  const dataPath = resolve(process.cwd(), 'mock-data/signedfiles.json')
  const data: ChunksResponse = JSON.parse(readFileSync(dataPath, 'utf-8'))
  const allChunks = data.groups.flatMap(g => g.chunks)

  const files = chunkIds.map(id => {
    const chunk = allChunks.find(c => c.id === id)
    if (!chunk) return null
    return {
      chunkId: chunk.id,
      fileName: `chunk_${String(chunk.hour).padStart(2,'0')}${String(chunk.minute).padStart(2,'0')}_${chunk.id}.gz`,
      sizeBytes: chunk.sizeBytes,
      url: `https://storage.dolusoft.internal/backups/2025-01-15/${chunk.id}.gz?token=${randomBytes(20).toString('hex')}&expires=${Date.now() + 3600000}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    }
  }).filter(Boolean)

  return { files: files as DownloadUrlsResponse['files'] }
})
