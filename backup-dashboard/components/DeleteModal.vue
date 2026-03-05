<script setup lang="ts">
import type { DeleteResult } from '~/types'
import { useChunksStore } from '~/stores/chunks'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const store = useChunksStore()
const { formatBytes, formatRecords, formatNumber } = useFormatters()

type Phase = 'confirm' | 'deleting' | 'result'
const phase = ref<Phase>('confirm')
const confirmed = ref(false)
const result = ref<DeleteResult | null>(null)
const deleteError = ref<string | null>(null)

// Snapshot selected chunks info at time of modal open
const snapshotIds = ref<string[]>([])
const snapshotChunks = ref<typeof store.selectedChunks>([])

watch(() => props.modelValue, (open) => {
  if (open) {
    phase.value = 'confirm'
    confirmed.value = false
    result.value = null
    deleteError.value = null
    snapshotIds.value = [...store.selectedIds]
    snapshotChunks.value = [...store.selectedChunks]
  }
})

const snapshotSize = computed(() =>
  snapshotChunks.value.reduce((s, c) => s + c.sizeBytes, 0)
)
const snapshotRecords = computed(() =>
  snapshotChunks.value.reduce((s, c) => s + c.dataCount, 0)
)

async function doDelete() {
  phase.value = 'deleting'
  deleteError.value = null
  try {
    const res = await $fetch<DeleteResult>('/api/chunks', {
      method: 'DELETE',
      body: { chunkIds: snapshotIds.value },
    })
    result.value = res
    phase.value = 'result'
    // Remove from store
    if (res.deletedCount > 0) {
      store.removeChunks(snapshotIds.value)
    }
  } catch (e: unknown) {
    deleteError.value = e instanceof Error ? e.message : 'Delete operation failed'
    phase.value = 'confirm'
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close" role="dialog" aria-modal="true" aria-label="Delete chunks">
        <div class="modal-panel">

          <!-- ── CONFIRM PHASE ── -->
          <template v-if="phase === 'confirm'">
            <div class="modal-header danger">
              <div class="modal-title">
                <span class="title-icon">⚠</span>
                <span>Delete Chunks</span>
              </div>
              <button class="close-btn" @click="close" aria-label="Close">✕</button>
            </div>

            <div class="modal-body">
              <!-- Warning banner -->
              <div class="warning-banner">
                <span class="warning-icon">!</span>
                <span>This action is <strong>irreversible</strong>. Deleted chunks cannot be recovered.</span>
              </div>

              <!-- Summary -->
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">CHUNKS</span>
                  <span class="summary-value">{{ formatNumber(snapshotIds.length) }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">TOTAL SIZE</span>
                  <span class="summary-value">{{ formatBytes(snapshotSize) }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">TOTAL RECORDS</span>
                  <span class="summary-value">{{ formatRecords(snapshotRecords) }}</span>
                </div>
              </div>

              <!-- File list (limited to 8, with overflow) -->
              <div class="file-list">
                <div
                  v-for="chunk in snapshotChunks.slice(0, 8)"
                  :key="chunk.id"
                  class="file-item"
                  :class="{ 'is-corrupted': chunk.status === 'corrupted' }"
                >
                  <span class="file-time">{{ String(chunk.hour).padStart(2,'0') }}:{{ String(chunk.minute).padStart(2,'0') }}</span>
                  <span class="file-id">{{ chunk.id }}</span>
                  <span class="file-size">{{ formatBytes(chunk.sizeBytes) }}</span>
                  <span v-if="chunk.status === 'corrupted'" class="file-corrupt-badge">CORRUPTED</span>
                </div>
                <div v-if="snapshotChunks.length > 8" class="overflow-note">
                  + {{ snapshotChunks.length - 8 }} more files
                </div>
              </div>

              <!-- API error -->
              <div v-if="deleteError" class="api-error">
                <span>⚠ {{ deleteError }}</span>
              </div>

              <!-- Confirm checkbox -->
              <label class="confirm-check">
                <input type="checkbox" v-model="confirmed" />
                <span>I understand this action cannot be undone</span>
              </label>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" @click="close">Cancel</button>
              <button
                class="btn-danger"
                :disabled="!confirmed"
                @click="doDelete"
              >
                Delete {{ snapshotIds.length }} Chunk{{ snapshotIds.length !== 1 ? 's' : '' }}
              </button>
            </div>
          </template>

          <!-- ── DELETING PHASE ── -->
          <template v-else-if="phase === 'deleting'">
            <div class="modal-header danger">
              <div class="modal-title">
                <span class="title-icon">⚠</span>
                <span>Deleting…</span>
              </div>
            </div>
            <div class="modal-body">
              <div class="state-container">
                <div class="spinner-red" aria-label="Deleting…" />
                <span class="state-text">Deleting {{ snapshotIds.length }} chunks from storage…</span>
              </div>
            </div>
          </template>

          <!-- ── RESULT PHASE ── -->
          <template v-else-if="phase === 'result' && result">
            <div class="modal-header" :class="result.success ? '' : 'partial'">
              <div class="modal-title" :class="result.success ? 'success' : 'warning'">
                <span class="title-icon">{{ result.success ? '✓' : '⚠' }}</span>
                <span>{{ result.success ? 'Deletion Complete' : 'Partial Deletion' }}</span>
              </div>
              <button class="close-btn" @click="close" aria-label="Close">✕</button>
            </div>
            <div class="modal-body">
              <div class="result-grid">
                <div class="result-item success">
                  <span class="result-label">DELETED</span>
                  <span class="result-value">{{ result.deletedCount }}</span>
                </div>
                <div class="result-item" :class="result.failedCount > 0 ? 'danger' : ''">
                  <span class="result-label">FAILED</span>
                  <span class="result-value">{{ result.failedCount }}</span>
                </div>
                <div class="result-item">
                  <span class="result-label">FREED</span>
                  <span class="result-value">{{ formatBytes(result.freedBytes) }}</span>
                </div>
              </div>
              <div v-if="result.errors.length > 0" class="error-list">
                <div v-for="(err, i) in result.errors" :key="i" class="error-item">
                  {{ err }}
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="close">Close</button>
            </div>
          </template>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 12, 8, 0.88);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-panel {
  background: var(--bg-elevated);
  border: 1px solid var(--border-bright);
  border-radius: 4px;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(224, 82, 82, 0.08);
  animation: fade-in 0.2s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-header.danger {
  border-bottom-color: rgba(224, 82, 82, 0.3);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--red);
}

.modal-title.success { color: var(--green-accent); }
.modal-title.warning { color: var(--amber); }

.title-icon { font-size: 14px; }

.close-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 2px;
  transition: color 0.15s, background 0.15s;
}
.close-btn:hover {
  color: var(--text-primary);
  background: var(--bg-panel);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.warning-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  background: var(--red-dim);
  border: 1px solid rgba(224, 82, 82, 0.3);
  border-radius: 3px;
  font-size: 12px;
  color: #f09090;
  line-height: 1.5;
}

.warning-icon {
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.summary-item {
  background: var(--bg-surface);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 0.12em;
}

.summary-value {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 600;
  color: var(--red);
}

.file-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 3px;
  overflow: hidden;
  max-height: 200px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--bg-surface);
}

.file-item.is-corrupted {
  background: rgba(224, 82, 82, 0.05);
}

.file-time { color: var(--text-secondary); min-width: 36px; }
.file-id { color: var(--text-muted); flex: 1; }
.file-size { color: var(--text-dim); }
.file-corrupt-badge {
  padding: 1px 5px;
  background: var(--red-dim);
  color: var(--red);
  border-radius: 2px;
  font-size: 9px;
  letter-spacing: 0.08em;
}

.overflow-note {
  padding: 6px 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-surface);
  text-align: center;
}

.api-error {
  padding: 8px 12px;
  background: var(--red-dim);
  border: 1px solid rgba(224, 82, 82, 0.3);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--red);
}

.confirm-check {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  user-select: none;
}

.confirm-check input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-bright);
  border-radius: 2px;
  background: var(--bg-surface);
  cursor: pointer;
  position: relative;
  transition: border-color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.confirm-check input[type="checkbox"]:checked {
  background: var(--red);
  border-color: var(--red);
}

.confirm-check input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 4px;
  width: 5px;
  height: 9px;
  border: 2px solid var(--bg-base);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.btn-secondary {
  padding: 7px 20px;
  background: none;
  border: 1px solid var(--border-bright);
  color: var(--text-secondary);
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.05em;
  transition: border-color 0.15s, color 0.15s;
}
.btn-secondary:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

.btn-danger {
  padding: 7px 20px;
  background: var(--red-dim);
  border: 1px solid var(--red);
  color: var(--red);
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.05em;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
.btn-danger:hover:not(:disabled) {
  background: var(--red);
  color: var(--bg-base);
}
.btn-danger:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Loading states */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 20px;
}

.spinner-red {
  width: 28px;
  height: 28px;
  border: 2px solid var(--red-dim);
  border-top-color: var(--red);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.state-text {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
}

/* Result grid */
.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.result-item {
  background: var(--bg-surface);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-label {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 0.12em;
}

.result-value {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--text-secondary);
}

.result-item.success .result-value { color: var(--green-accent); }
.result-item.danger .result-value { color: var(--red); }

.error-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.error-item {
  padding: 6px 10px;
  background: var(--red-dim);
  border-left: 2px solid var(--red);
  font-family: var(--font-mono);
  font-size: 10px;
  color: #f09090;
  border-radius: 0 2px 2px 0;
}

/* Transition */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
