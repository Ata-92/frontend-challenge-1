<script setup lang="ts">
import { useChunksStore } from '~/stores/chunks'

const store = useChunksStore()
const { formatBytes, formatRecords, formatNumber } = useFormatters()
</script>

<template>
  <footer class="dash-footer">
    <div class="footer-inner">
      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-block">
          <span class="stat-label">TOTAL RECORDS</span>
          <span class="stat-value">{{ formatRecords(store.meta?.totalRecords ?? 0) }}</span>
        </div>
        <div class="divider" />
        <div class="stat-block">
          <span class="stat-label">TOTAL CHUNKS</span>
          <span class="stat-value">{{ formatNumber(store.meta?.totalChunks ?? 0) }}</span>
        </div>
        <div class="divider" />
        <div class="stat-block">
          <span class="stat-label">SIZE ON DISK</span>
          <span class="stat-value">{{ formatBytes(store.meta?.totalSizeBytes ?? 0) }}</span>
        </div>
        <div class="divider" />
        <div class="stat-block">
          <span class="stat-label">DATE</span>
          <span class="stat-value">{{ store.meta?.date ?? '—' }}</span>
        </div>
      </div>

      <!-- Color scale -->
      <div class="scale-row">
        <span class="scale-label">LESS</span>
        <div class="scale-bar">
          <div
            v-for="(color, i) in store.colorScale"
            :key="i"
            class="scale-swatch"
            :style="{ backgroundColor: color }"
            :title="`Level ${i + 1}`"
          />
        </div>
        <span class="scale-label">MORE</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.dash-footer {
  position: sticky;
  bottom: 0;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-bright);
  padding: 10px 24px;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-block {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stat-label {
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--text-dim);
  letter-spacing: 0.12em;
  line-height: 1;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  line-height: 1.4;
}

.divider {
  width: 1px;
  height: 28px;
  background: var(--border);
}

.scale-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scale-label {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 0.08em;
}

.scale-bar {
  display: flex;
  gap: 2px;
}

.scale-swatch {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid rgba(255,255,255,0.05);
}

@media (max-width: 700px) {
  .footer-inner {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
