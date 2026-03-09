<script setup lang="ts">
import type { Chunk } from '~/types'

const { formatBytes, formatRecords, formatRatio, formatTime } = useFormatters()

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const chunk = ref<Chunk | null>(null)

function show(c: Chunk, event: MouseEvent) {
  chunk.value = c
  visible.value = true
  position(event)
}

function position(event: MouseEvent) {
  const offset = 12
  const tipW = 200
  const tipH = 120
  let tx = event.clientX + offset
  let ty = event.clientY + offset
  if (tx + tipW > window.innerWidth) tx = event.clientX - tipW - offset
  if (ty + tipH > window.innerHeight) ty = event.clientY - tipH - offset
  x.value = tx
  y.value = ty
}

function hide() {
  visible.value = false
  chunk.value = null
}

// Expose so HeatmapCell can call show/hide
defineExpose({ show, hide, position })
</script>

<template>
  <Teleport to="body">
    <Transition name="tooltip">
      <div
        v-if="visible && chunk"
        class="chunk-tooltip"
        :style="{ left: `${x}px`, top: `${y}px` }"
        aria-hidden="true"
      >
        <!-- Time header -->
        <div class="tip-header">
          <span class="tip-time">{{ formatTime(chunk.hour, chunk.minute) }}</span>
          <span v-if="chunk.status === 'corrupted'" class="tip-status corrupted">⚠ CORRUPTED</span>
        </div>

        <!-- Stats grid -->
        <div class="tip-grid">
          <div class="tip-item">
            <span class="tip-label">RECORDS</span>
            <span class="tip-value">{{ formatRecords(chunk.dataCount) }}</span>
          </div>
          <div class="tip-item">
            <span class="tip-label">SIZE</span>
            <span class="tip-value">{{ formatBytes(chunk.sizeBytes) }}</span>
          </div>
          <div class="tip-item">
            <span class="tip-label">RATIO</span>
            <span class="tip-value">{{ formatRatio(chunk.compressionRatio) }}</span>
          </div>
          <div class="tip-item">
            <span class="tip-label">RAW</span>
            <span class="tip-value">{{ formatBytes(chunk.rawSizeBytes) }}</span>
          </div>
        </div>

        <!-- Checksum -->
        <div class="tip-checksum">{{ chunk.checksum.slice(0, 16) }}…</div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.chunk-tooltip {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  background: var(--bg-elevated);
  border: 1px solid var(--border-bright);
  border-radius: 3px;
  padding: 8px 10px;
  width: 200px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6), 0 0 12px rgba(57,184,67,0.1);
}

.tip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.tip-time {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--green-text);
  letter-spacing: 0.05em;
}

.tip-status {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  padding: 2px 5px;
  border-radius: 2px;
}

.tip-status.ok {
  background: var(--green-dim);
  color: var(--green-accent);
}

.tip-status.corrupted {
  background: var(--red-dim);
  color: var(--red);
}

.tip-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 8px;
}

.tip-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tip-label {
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--text-secondary);
  letter-spacing: 0.12em;
}

.tip-value {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.tip-checksum {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-secondary);
  letter-spacing: 0.04em;
  padding-top: 6px;
  border-top: 1px solid var(--border);
}

.tooltip-enter-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.tooltip-leave-active { transition: opacity 0.08s ease; }
.tooltip-enter-from { opacity: 0; transform: translateY(3px); }
.tooltip-leave-to { opacity: 0; }
</style>
