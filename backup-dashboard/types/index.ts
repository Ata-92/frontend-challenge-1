// Backup Chunk — a single minute's worth of compressed log data
export interface Chunk {
  id: string
  hour: number
  minute: number
  timestamp: string
  dataCount: number
  sizeBytes: number
  rawSizeBytes: number
  compressionRatio: number
  checksum: string
  status: 'ok' | 'corrupted'
}

// Hourly group — aggregation of all chunks within one hour
export interface HourGroup {
  hour: number
  label: string
  chunks: Chunk[]
  stats: HourStats
}

export interface HourStats {
  chunkCount: number
  totalRecords: number
  totalSizeBytes: number
  totalRawSizeBytes: number
  compressionRatio: number
}

// API response shapes
export interface ChunksResponse {
  meta: ChunksMeta
  groups: HourGroup[]
}

export interface ChunksMeta {
  date: string
  totalChunks: number
  totalRecords: number
  totalSizeBytes: number
  minDataCount: number
  maxDataCount: number
}

export interface DownloadFile {
  chunkId: string
  fileName: string
  sizeBytes: number
  url: string
  expiresAt: string
}

export interface DownloadUrlsResponse {
  files: DownloadFile[]
}

export interface DeleteResult {
  success: boolean
  deletedCount: number
  failedCount: number
  freedBytes: number
  errors: string[]
}
