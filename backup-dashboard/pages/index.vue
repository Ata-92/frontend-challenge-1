<script setup lang="ts">
import { useChunksStore } from '~/stores/chunks'

const store = useChunksStore()
const { formatBytes, formatRecords, formatNumber } = useFormatters()

const showDownloadModal = ref(false)
const showDeleteModal = ref(false)

// Fetch data on mount
onMounted(() => {
  store.fetchChunks()
})

// Action toolbar state
const canAct = computed(() => store.selectedCount > 0)

function openDownload() {
  if (canAct.value) showDownloadModal.value = true
}

function openDelete() {
  if (canAct.value) showDeleteModal.value = true
}

// Minute labels for axis
const minuteLabels = computed(() => {
  const labels: string[] = []
  for (let i = 0; i < 60; i += 10) {
    labels.push(String(i).padStart(2, '0'))
  }
  return labels
})
</script>

<template>
  <div class="dashboard">
    <!-- ── HEADER ── -->
    <header class="dash-header">
      <div class="header-left">
        <div class="logo-mark">
          <div class="logo-grid">
            <span v-for="i in 9" :key="i" class="logo-dot" :style="{ animationDelay: `${i * 0.1}s` }" />
          </div>
        </div>
        <div class="header-text">
          <h1 class="header-title">BACKUP INTEGRITY</h1>
          <p class="header-sub">Firewall Log Chunk Monitor · 2025-01-15</p>
        </div>
      </div>

      <!-- Action toolbar -->
      <div class="action-bar">
        <!-- Select all -->
        <label class="select-all-wrap" title="Select / deselect all chunks">
          <input
            type="checkbox"
            class="select-all-checkbox"
            :checked="store.isAllSelected"
            :indeterminate="store.selectedCount > 0 && !store.isAllSelected"
            @change="store.toggleAll"
            aria-label="Select all chunks"
          />
          <span class="select-all-label">
            {{ store.isAllSelected ? 'Deselect All' : 'Select All' }}
          </span>
        </label>

        <div v-if="store.selectedCount > 0" class="selection-info">
          <span class="sel-count">{{ formatNumber(store.selectedCount) }} selected</span>
          <span class="sel-size">{{ formatBytes(store.totalSelectedSize) }}</span>
          <button class="clear-btn" @click="store.clearSelection" title="Clear selection">×</button>
        </div>

        <div class="action-buttons">
          <button
            class="action-btn download"
            :disabled="!canAct"
            @click="openDownload"
            :title="canAct ? `Download ${store.selectedCount} chunks` : 'Select chunks to download'"
          >
            <span class="btn-icon">↓</span>
            Download<span v-if="canAct">({{ store.selectedCount }})</span>
          </button>
          <button
            class="action-btn delete"
            :disabled="!canAct"
            @click="openDelete"
            :title="canAct ? `Delete ${store.selectedCount} chunks` : 'Select chunks to delete'"
          >
            <span class="btn-icon">✕</span>
            Delete<span v-if="canAct">({{ store.selectedCount }})</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ── MAIN CONTENT ── -->
    <main class="dash-main">
      <!-- Loading state -->
      <div v-if="store.isLoading" class="loading-state">
        <div class="loading-grid">
          <div v-for="i in 24" :key="i" class="loading-row">
            <div class="loading-label" />
            <div class="loading-cells">
              <div v-for="j in 60" :key="j" class="loading-cell" :style="{ animationDelay: `${(i * 60 + j) * 3}ms` }" />
            </div>
          </div>
        </div>
        <p class="loading-text">Loading chunk data…</p>
      </div>

      <!-- Error state -->
      <div v-else-if="store.error" class="error-state">
        <span class="error-icon-lg">⚠</span>
        <p class="error-message">{{ store.error }}</p>
        <button class="retry-btn" @click="store.fetchChunks">Retry</button>
      </div>

      <!-- Heatmap -->
      <div v-else class="heatmap-container fade-in">
        <!-- Minute axis header -->
        <div class="axis-header">
          <div class="axis-spacer" />
          <div class="axis-labels">
            <span
              v-for="label in minuteLabels"
              :key="label"
              class="axis-label"
            >:{{ label }}</span>
          </div>
          <div class="axis-stats-spacer" />
        </div>

        <!-- Hour rows -->
        <div class="hour-list" role="grid" aria-label="Backup chunk heatmap">
          <HourRow
            v-for="group in store.groups"
            :key="group.hour"
            :group="group"
          />
        </div>
      </div>
    </main>

    <!-- ── FOOTER ── -->
    <DashboardFooter />

    <!-- ── MODALS ── -->
    <DownloadModal v-model="showDownloadModal" />
    <DeleteModal v-model="showDeleteModal" />
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── HEADER ── */
.dash-header {
  position: sticky;
  top: 0;
  z-index: 200;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-bright);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 56px;
  backdrop-filter: blur(8px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-mark {
  flex-shrink: 0;
}

.logo-grid {
  display: grid;
  grid-template-columns: repeat(3, 6px);
  gap: 2px;
}

.logo-dot {
  width: 6px;
  height: 6px;
  border-radius: 1px;
  background: var(--green-accent);
  animation: pulse-glow 2s ease-in-out infinite;
}

.logo-dot:nth-child(even) { background: var(--green-mid); }
.logo-dot:nth-child(3n) { background: var(--green-glow); }

.header-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.header-title {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--green-text);
  letter-spacing: 0.15em;
  line-height: 1;
}

.header-sub {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.06em;
}

/* ── ACTION BAR ── */
.action-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.select-all-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  user-select: none;
}

.select-all-checkbox {
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

.select-all-checkbox:checked {
  background: var(--green-accent);
  border-color: var(--green-accent);
}

.select-all-checkbox:checked::after {
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

.select-all-checkbox:indeterminate {
  background: var(--green-dim);
  border-color: var(--green-mid);
}

.select-all-checkbox:indeterminate::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 1.5px;
  background: var(--green-accent);
}

.select-all-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-bright);
  border-radius: 2px;
}

.sel-count {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--green-accent);
}

.sel-size {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
}

.clear-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  transition: color 0.15s;
}
.clear-btn:hover { color: var(--text-primary); }

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 2px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, opacity 0.15s;
  white-space: nowrap;
  border: 1px solid;
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-btn.download {
  background: var(--green-dim);
  border-color: var(--green-mid);
  color: var(--green-accent);
}
.action-btn.download:hover:not(:disabled) {
  background: var(--green-mid);
  border-color: var(--green-bright);
  color: var(--bg-base);
}

.action-btn.delete {
  background: var(--red-dim);
  border-color: rgba(224, 82, 82, 0.4);
  color: var(--red);
}
.action-btn.delete:hover:not(:disabled) {
  background: var(--red);
  border-color: var(--red);
  color: var(--bg-base);
}

.btn-icon {
  font-size: 13px;
  line-height: 1;
}

/* ── MAIN ── */
.dash-main {
  flex: 1;
  padding: 16px 24px 0;
  overflow: hidden;
}

/* ── AXIS ── */
.axis-header {
  display: grid;
  grid-template-columns: 88px 1fr 200px;
  gap: 10px;
  padding: 0 0 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2px;
}

.axis-spacer { }
.axis-stats-spacer { }

.axis-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 1px;
}

.axis-label {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 0.04em;
}

/* ── HOUR LIST ── */
.hour-list {
  overflow-y: auto;
  max-height: calc(100vh - 160px);
  padding-bottom: 8px;
}

/* ── LOADING ── */
.loading-state {
  position: relative;
  padding: 24px 0;
}

.loading-grid {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.loading-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 10px;
  align-items: center;
}

.loading-label {
  height: 10px;
  background: var(--bg-elevated);
  border-radius: 2px;
  width: 36px;
  animation: shimmer 1.5s ease-in-out infinite;
}

.loading-cells {
  display: grid;
  grid-template-columns: repeat(60, 1fr);
  gap: 1.5px;
}

.loading-cell {
  aspect-ratio: 1;
  background: var(--bg-elevated);
  border-radius: 2px;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

.loading-text {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
}

/* ── ERROR ── */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 20px;
}

.error-icon-lg {
  font-size: 36px;
  color: var(--red);
}

.error-message {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
}

.retry-btn {
  padding: 8px 20px;
  background: none;
  border: 1px solid var(--border-bright);
  color: var(--text-secondary);
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 12px;
  transition: border-color 0.15s, color 0.15s;
}
.retry-btn:hover {
  border-color: var(--green-accent);
  color: var(--green-accent);
}

/* ── HEATMAP ── */
.heatmap-container {
  height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
}

@media (max-width: 900px) {
  .dash-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 16px;
    min-height: auto;
    gap: 10px;
  }
  .dash-main { padding: 12px 16px 0; }
  .axis-header {
    grid-template-columns: 70px 1fr;
  }
  .axis-stats-spacer { display: none; }
}
</style>
