<script setup lang="ts">
import type { DownloadFile } from '~/types'
import { useChunksStore } from '~/stores/chunks'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const store = useChunksStore()
const { formatBytes } = useFormatters()

const isLoading = ref(false)
const files = ref<DownloadFile[]>([])
const fetchError = ref<string | null>(null)
const hasFetched = ref(false)

watch(() => props.modelValue, async (open) => {
  if (open && !hasFetched.value) {
    await fetchUrls()
  }
  if (!open) {
    // Reset on close
    files.value = []
    fetchError.value = null
    hasFetched.value = false
  }
})

async function fetchUrls() {
  isLoading.value = true
  fetchError.value = null
  try {
    const chunkIds = [...store.selectedIds]
    const result = await $fetch<{ files: DownloadFile[] }>('/api/chunks/download-urls', {
      method: 'POST',
      body: { chunkIds },
    })
    files.value = result.files
    hasFetched.value = true
  } catch (e: unknown) {
    fetchError.value = e instanceof Error ? e.message : 'Failed to generate download URLs'
  } finally {
    isLoading.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}

function formatExpiry(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close" role="dialog" aria-modal="true" aria-label="Download chunks">
        <div class="modal-panel">
          <!-- Header -->
          <div class="modal-header">
            <div class="modal-title">
              <span class="title-icon">↓</span>
              <span>Download URLs</span>
            </div>
            <div class="modal-subtitle">{{ store.selectedCount }} chunks · {{ formatBytes(store.totalSelectedSize) }}</div>
            <button class="close-btn" @click="close" aria-label="Close">✕</button>
          </div>

          <!-- Content -->
          <div class="modal-body">
            <!-- Loading -->
            <div v-if="isLoading" class="state-container">
              <div class="spinner" aria-label="Generating URLs…" />
              <span class="state-text">Generating signed URLs…</span>
            </div>

            <!-- Error -->
            <div v-else-if="fetchError" class="state-container error">
              <span class="error-icon">⚠</span>
              <span>{{ fetchError }}</span>
              <button class="retry-btn" @click="fetchUrls">Retry</button>
            </div>

            <!-- File list -->
            <div v-else class="file-list">
              <div v-for="file in files" :key="file.chunkId" class="file-item">
                <div class="file-info">
                  <span class="file-name">{{ file.fileName }}</span>
                  <span class="file-size">{{ formatBytes(file.sizeBytes) }}</span>
                </div>
                <div class="file-meta">
                  <span class="file-expiry">Expires {{ formatExpiry(file.expiresAt) }}</span>
                  <a :href="file.url" target="_blank" rel="noopener" class="download-link" :download="file.fileName">
                    Download
                    <span class="link-arrow">→</span>
                  </a>
                </div>
              </div>

              <div v-if="files.length === 0" class="state-container">
                <span class="state-text">No files returned.</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn-secondary" @click="close">Close</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 12, 8, 0.85);
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
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(57, 184, 67, 0.08);
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

.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--green-accent);
  letter-spacing: 0.05em;
}

.title-icon {
  font-size: 16px;
}

.modal-subtitle {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  margin-left: 4px;
}

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
  padding: 8px 0;
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
}

.state-container.error {
  color: var(--red);
}

.error-icon {
  font-size: 24px;
}

.retry-btn {
  padding: 6px 16px;
  background: none;
  border: 1px solid var(--red);
  color: var(--red);
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;
  transition: background 0.15s;
}
.retry-btn:hover {
  background: var(--red-dim);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-bright);
  border-top-color: var(--green-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.state-text {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
}

.file-list {
  display: flex;
  flex-direction: column;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
}
.file-item:hover {
  background: var(--bg-panel);
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-name {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.file-expiry {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);
}

.download-link {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  background: var(--green-dim);
  border: 1px solid var(--green-mid);
  color: var(--green-accent);
  border-radius: 2px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.download-link:hover {
  background: var(--green-mid);
  border-color: var(--green-bright);
  color: var(--bg-base);
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
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

/* Transition */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
