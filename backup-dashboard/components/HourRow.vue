<script setup lang="ts">
import type { HourGroup } from '~/types'
import { useChunksStore } from '~/stores/chunks'

const props = defineProps<{
  group: HourGroup
}>()

const store = useChunksStore()
const { formatBytes, formatRecords, formatRatio } = useFormatters()

const isSelected = store.isHourSelected(props.group.hour)
const isIndeterminate = store.isHourIndeterminate(props.group.hour)

// Build a map: minute -> chunk (for fast lookup)
const chunkByMinute = computed(() => {
  const map = new Map<number, typeof props.group.chunks[0]>()
  props.group.chunks.forEach(c => map.set(c.minute, c))
  return map
})

function handleHourToggle() {
  store.toggleHour(props.group.hour)
}

const hourLabel = computed(() => props.group.label.padStart(5, ' '))
</script>

<template>
  <div class="hour-row">
    <!-- Hour label + checkbox -->
    <div class="hour-meta">
      <label class="hour-checkbox-wrap" :title="`Select all chunks in ${group.label}`">
        <input
          type="checkbox"
          class="hour-checkbox"
          :checked="isSelected"
          :indeterminate="isIndeterminate"
          @change="handleHourToggle"
          :aria-label="`Select all chunks in hour ${group.label}`"
        />
      </label>
      <span class="hour-label">{{ hourLabel }}</span>
    </div>

    <!-- 60-minute heatmap grid -->
    <div class="minute-grid" role="grid" :aria-label="`Hour ${group.label} chunks`">
      <HeatmapCell
        v-for="m in 60"
        :key="m - 1"
        :chunk="chunkByMinute.get(m - 1)!"
        :minute="m - 1"
        :is-empty="!chunkByMinute.has(m - 1)"
      />
    </div>

    <!-- Inline stats -->
    <div class="hour-stats">
      <span class="stat">
        <span class="stat-label">REC</span>
        <span class="stat-value">{{ formatRecords(group.stats.totalRecords) }}</span>
      </span>
      <span class="stat">
        <span class="stat-label">SIZE</span>
        <span class="stat-value">{{ formatBytes(group.stats.totalSizeBytes) }}</span>
      </span>
      <span class="stat">
        <span class="stat-label">RATIO</span>
        <span class="stat-value">{{ formatRatio(group.stats.compressionRatio) }}</span>
      </span>
      <span class="stat chunks-stat">
        <span class="stat-label">CHK</span>
        <span class="stat-value">{{ group.stats.chunkCount }}/60</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.hour-row {
  display: grid;
  grid-template-columns: 88px 1fr 200px;
  align-items: center;
  gap: 10px;
  padding: 3px 0;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s ease;
}

.hour-row:hover {
  background: rgba(57, 184, 67, 0.03);
}

.hour-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
}

.hour-checkbox-wrap {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.hour-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border: 1px solid var(--border-bright);
  border-radius: 2px;
  background: var(--bg-surface);
  cursor: pointer;
  position: relative;
  transition: border-color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.hour-checkbox:checked {
  background: var(--green-accent);
  border-color: var(--green-accent);
}

.hour-checkbox:checked::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 3px;
  width: 5px;
  height: 8px;
  border: 2px solid var(--bg-base);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

.hour-checkbox:indeterminate {
  background: var(--green-dim);
  border-color: var(--green-mid);
}

.hour-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 1.5px;
  background: var(--green-accent);
}

.hour-checkbox:hover {
  border-color: var(--green-accent);
}

.hour-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  min-width: 36px;
}

.minute-grid {
  display: grid;
  grid-template-columns: repeat(60, 1fr);
  gap: 1.5px;
  padding: 3px 0;
}

.hour-stats {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 38px;
}

.stat-label {
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--text-dim);
  letter-spacing: 0.1em;
  line-height: 1;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.chunks-stat .stat-value {
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .hour-row {
    grid-template-columns: 70px 1fr;
  }
  .hour-stats {
    display: none;
  }
}
</style>
