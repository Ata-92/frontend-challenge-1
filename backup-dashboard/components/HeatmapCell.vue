<script setup lang="ts">
import type { Chunk } from "~/types";
import { useChunksStore } from "~/stores/chunks";

const props = defineProps<{
  chunk?: Chunk;
  minute: number;
  hour: number;
  isEmpty?: boolean;
}>();

const store = useChunksStore();
const { formatBytes, formatRecords, formatTime } = useFormatters();

const isSelected = computed(() => store.selectedIds.has(props.chunk?.id));

const bgColor = computed(() => {
  if (!props.chunk) return "transparent";
  return store.getChunkColor(props.chunk);
});

const opacity = computed(() => {
  if (!props.chunk) return 0;
  return store.getChunkOpacity(props.chunk);
});

const tooltipText = computed(() => {
  if (!props.chunk) return "";
  const { hour, minute, dataCount, sizeBytes, compressionRatio, status } =
    props.chunk;
  return `${formatTime(hour, minute)} · ${formatRecords(
    dataCount
  )} records · ${formatBytes(sizeBytes)} · ${compressionRatio}x compression${
    status === "corrupted" ? " · ⚠ CORRUPTED" : ""
  }`;
});

function handleClick() {
  if (props.chunk) {
    store.toggleChunk(props.chunk.id);
  }
}
</script>

<template>
  <div
    v-if="!isEmpty && chunk"
    class="heatmap-cell"
    :class="{
      'is-selected': isSelected,
      'is-corrupted': chunk.status === 'corrupted',
    }"
    :style="{ backgroundColor: bgColor, opacity }"
    :title="tooltipText"
    @click="handleClick"
    role="checkbox"
    :aria-checked="isSelected"
    :aria-label="tooltipText"
    tabindex="0"
    @keydown.space.prevent="handleClick"
    @keydown.enter.prevent="handleClick"
  >
    <span v-if="isSelected" class="check-mark" aria-hidden="true">✓</span>
    <span
      v-if="chunk.status === 'corrupted'"
      class="corrupt-mark"
      aria-hidden="true"
      >!</span
    >
  </div>
  <div
    v-else
    class="heatmap-cell is-empty"
    :title="`${String(props.hour).padStart(2, '0')}:${String(minute).padStart(
      2,
      '0'
    )} — no data`"
    aria-hidden="true"
  />
</template>

<style scoped>
.heatmap-cell {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  transition: transform 0.1s ease, box-shadow 0.1s ease, opacity 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.heatmap-cell:hover:not(.is-empty) {
  transform: scale(1.4);
  z-index: 10;
  box-shadow: 0 0 8px rgba(82, 204, 92, 0.5);
  opacity: 1 !important;
}

.heatmap-cell.is-selected {
  opacity: 1 !important;
  box-shadow: 0 0 0 2px #fff, 0 0 8px rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.heatmap-cell.is-empty {
  background: rgba(255, 255, 255, 0.03);
  cursor: default;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.heatmap-cell.is-corrupted {
  box-shadow: 0 0 0 2px var(--red) !important;
  background-image: linear-gradient(
    rgba(224, 82, 82, 0.35),
    rgba(224, 82, 82, 0.35)
  ) !important;
  opacity: 1 !important;
}

.check-mark {
  font-size: 9px;
  color: #fff;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.corrupt-mark {
  font-size: 9px;
  color: #fff;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}
</style>
