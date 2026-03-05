import { defineStore } from 'pinia'
import type { Chunk, HourGroup, ChunksMeta } from '~/types'

export const useChunksStore = defineStore('chunks', () => {
  // ─── State ───────────────────────────────────────────────
  const groups = ref<HourGroup[]>([])
  const meta = ref<ChunksMeta | null>(null)
  const selectedIds = ref<Set<string>>(new Set())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ─── Getters ─────────────────────────────────────────────
  const allChunks = computed<Chunk[]>(() =>
    groups.value.flatMap(g => g.chunks)
  )

  const selectedChunks = computed<Chunk[]>(() =>
    allChunks.value.filter(c => selectedIds.value.has(c.id))
  )

  const selectedCount = computed(() => selectedIds.value.size)

  const totalSelectedSize = computed(() =>
    selectedChunks.value.reduce((sum, c) => sum + c.sizeBytes, 0)
  )

  const totalSelectedRecords = computed(() =>
    selectedChunks.value.reduce((sum, c) => sum + c.dataCount, 0)
  )

  const isAllSelected = computed(() =>
    allChunks.value.length > 0 &&
    allChunks.value.every(c => selectedIds.value.has(c.id))
  )

  const isHourSelected = (hour: number) => computed(() => {
    const group = groups.value.find(g => g.hour === hour)
    if (!group || group.chunks.length === 0) return false
    return group.chunks.every(c => selectedIds.value.has(c.id))
  })

  const isHourIndeterminate = (hour: number) => computed(() => {
    const group = groups.value.find(g => g.hour === hour)
    if (!group || group.chunks.length === 0) return false
    const selectedInHour = group.chunks.filter(c => selectedIds.value.has(c.id)).length
    return selectedInHour > 0 && selectedInHour < group.chunks.length
  })

  // Color scale: 8 levels of green
  const colorScale = [
    '#0d1f0e', // 0 - near black green
    '#1a3d1c',
    '#236b27',
    '#2d9134',
    '#39b843',
    '#52cc5c',
    '#78e082',
    '#9feda8', // 7 - bright mint
  ]

  const getChunkColor = (chunk: Chunk): string => {
    if (!meta.value) return colorScale[0]
    const { minDataCount, maxDataCount } = meta.value
    const range = maxDataCount - minDataCount
    if (range === 0) return colorScale[3]
    const normalized = (chunk.dataCount - minDataCount) / range
    const index = Math.min(7, Math.floor(normalized * 8))
    return colorScale[index]
  }

  const getChunkOpacity = (chunk: Chunk): number => {
    if (!meta.value) return 0.3
    const { minDataCount, maxDataCount } = meta.value
    const range = maxDataCount - minDataCount
    if (range === 0) return 0.5
    const normalized = (chunk.dataCount - minDataCount) / range
    return 0.15 + normalized * 0.85
  }

  // ─── Actions ─────────────────────────────────────────────
  async function fetchChunks() {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch('/api/chunks')
      groups.value = data.groups
      meta.value = data.meta
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load chunk data'
    } finally {
      isLoading.value = false
    }
  }

  function toggleChunk(id: string) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
  }

  function toggleHour(hour: number) {
    const group = groups.value.find(g => g.hour === hour)
    if (!group) return
    const allSelected = group.chunks.every(c => selectedIds.value.has(c.id))
    if (allSelected) {
      group.chunks.forEach(c => selectedIds.value.delete(c.id))
    } else {
      group.chunks.forEach(c => selectedIds.value.add(c.id))
    }
  }

  function toggleAll() {
    if (isAllSelected.value) {
      selectedIds.value.clear()
    } else {
      allChunks.value.forEach(c => selectedIds.value.add(c.id))
    }
  }

  function clearSelection() {
    selectedIds.value.clear()
  }

  // Remove deleted chunks from store and selection
  function removeChunks(ids: string[]) {
    const idSet = new Set(ids)
    ids.forEach(id => selectedIds.value.delete(id))
    groups.value = groups.value.map(g => ({
      ...g,
      chunks: g.chunks.filter(c => !idSet.has(c.id)),
      stats: {
        ...g.stats,
        chunkCount: g.chunks.filter(c => !idSet.has(c.id)).length,
        totalRecords: g.chunks.filter(c => !idSet.has(c.id)).reduce((s, c) => s + c.dataCount, 0),
        totalSizeBytes: g.chunks.filter(c => !idSet.has(c.id)).reduce((s, c) => s + c.sizeBytes, 0),
        totalRawSizeBytes: g.chunks.filter(c => !idSet.has(c.id)).reduce((s, c) => s + c.rawSizeBytes, 0),
      }
    })).filter(g => g.chunks.length > 0)

    // Update meta
    if (meta.value) {
      const remaining = groups.value.flatMap(g => g.chunks)
      meta.value = {
        ...meta.value,
        totalChunks: remaining.length,
        totalRecords: remaining.reduce((s, c) => s + c.dataCount, 0),
        totalSizeBytes: remaining.reduce((s, c) => s + c.sizeBytes, 0),
        minDataCount: remaining.length ? Math.min(...remaining.map(c => c.dataCount)) : 0,
        maxDataCount: remaining.length ? Math.max(...remaining.map(c => c.dataCount)) : 0,
      }
    }
  }

  return {
    // state
    groups,
    meta,
    selectedIds,
    isLoading,
    error,
    // getters
    allChunks,
    selectedChunks,
    selectedCount,
    totalSelectedSize,
    totalSelectedRecords,
    isAllSelected,
    isHourSelected,
    isHourIndeterminate,
    colorScale,
    getChunkColor,
    getChunkOpacity,
    // actions
    fetchChunks,
    toggleChunk,
    toggleHour,
    toggleAll,
    clearSelection,
    removeChunks,
  }
})
