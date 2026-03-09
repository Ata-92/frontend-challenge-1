<script setup lang="ts">
import { useChunksStore } from "~/stores/chunks";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const store = useChunksStore();
const { formatBytes, formatRecords } = useFormatters();

type Phase = "confirm" | "downloading" | "done" | "error";
const phase = ref<Phase>("confirm");
const errorMsg = ref<string | null>(null);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      phase.value = "confirm";
      errorMsg.value = null;
    }
  }
);

async function startDownload() {
  phase.value = "downloading";
  errorMsg.value = null;

  try {
    const chunkIds = [...store.selectedIds];

    const response = await fetch("/api/chunks/download-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunkIds }),
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chunks_2025-01-15_${chunkIds.length}files.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    phase.value = "done";
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : "Download failed";
    phase.value = "error";
  }
}

function close() {
  emit("update:modelValue", false);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="modal-overlay"
        @click.self="close"
        role="dialog"
        aria-modal="true"
      >
        <div class="modal-panel">
          <div class="modal-header">
            <div class="modal-title"><span>↓</span> Bulk Download</div>
            <button class="close-btn" @click="close">✕</button>
          </div>

          <div v-if="phase === 'confirm'" class="modal-body">
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">CHUNKS</span>
                <span class="summary-value">{{ store.selectedCount }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">RECORDS</span>
                <span class="summary-value">{{
                  formatRecords(store.totalSelectedRecords)
                }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">SIZE</span>
                <span class="summary-value">{{
                  formatBytes(store.totalSelectedSize)
                }}</span>
              </div>
            </div>
            <p class="info-text">
              All selected chunks will be bundled into a single
              <strong>.zip</strong> file with one JSON per chunk plus a
              manifest.
            </p>
            <div class="file-list">
              <div
                v-for="chunk in store.selectedChunks"
                :key="chunk.id"
                class="file-item"
                :class="{ 'is-corrupted': chunk.status === 'corrupted' }"
              >
                <span class="file-time"
                  >{{ String(chunk.hour).padStart(2, "0") }}:{{
                    String(chunk.minute).padStart(2, "0")
                  }}</span
                >
                <span class="file-id">{{ chunk.id }}</span>
                <span class="file-size">{{
                  formatBytes(chunk.sizeBytes)
                }}</span>
                <span
                  v-if="chunk.status === 'corrupted'"
                  class="file-corrupt-badge"
                  >CORRUPTED</span
                >
              </div>
            </div>
          </div>

          <div v-else-if="phase === 'downloading'" class="modal-body">
            <div class="state-container">
              <div class="spinner" />
              <span class="state-text"
                >Bundling {{ store.selectedCount }} chunks…</span
              >
            </div>
          </div>

          <div v-else-if="phase === 'done'" class="modal-body">
            <div class="state-container">
              <span class="success-icon">✓</span>
              <span class="state-text">Download started</span>
              <span class="state-sub"
                >Check your downloads folder for the .zip file</span
              >
            </div>
          </div>

          <div v-else-if="phase === 'error'" class="modal-body">
            <div class="state-container">
              <span class="error-icon">⚠</span>
              <span class="state-text">{{ errorMsg }}</span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="close">
              {{ phase === "done" ? "Close" : "Cancel" }}
            </button>
            <button
              v-if="phase === 'confirm' || phase === 'error'"
              class="btn-download"
              @click="startDownload"
            >
              ↓ Download ZIP
            </button>
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
  max-width: 420px;
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
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  padding: 12px 14px;
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
  font-size: 16px;
  font-weight: 600;
  color: var(--green-accent);
}
.info-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.info-text strong {
  color: var(--text-primary);
}
.file-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 3px;
  overflow-y: auto;
  max-height: 300px;
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
.file-item:last-child {
  border-bottom: none;
}
.file-item.is-corrupted {
  background: rgba(224, 82, 82, 0.05);
}
.file-time {
  color: var(--text-secondary);
  min-width: 36px;
}
.file-id {
  color: var(--text-muted);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-size {
  color: var(--text-dim);
  flex-shrink: 0;
}
.file-corrupt-badge {
  padding: 1px 5px;
  background: var(--red-dim);
  color: var(--red);
  border-radius: 2px;
  font-size: 9px;
  letter-spacing: 0.08em;
  flex-shrink: 0;
}
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 20px;
}
.state-text {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
}
.state-sub {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}
.success-icon {
  font-size: 28px;
  color: var(--green-accent);
}
.error-icon {
  font-size: 28px;
  color: var(--red);
}
.spinner {
  width: 26px;
  height: 26px;
  border: 2px solid var(--border-bright);
  border-top-color: var(--green-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
  transition: border-color 0.15s, color 0.15s;
}
.btn-secondary:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}
.btn-download {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 20px;
  background: var(--green-dim);
  border: 1px solid var(--green-mid);
  color: var(--green-accent);
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
.btn-download:hover {
  background: var(--green-mid);
  color: var(--bg-base);
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
