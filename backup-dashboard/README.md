# Backup Integrity Dashboard

A single-page application for monitoring firewall log backup chunk integrity, built with Nuxt 4, Nuxt UI, Pinia, and TypeScript.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Architecture Decisions

### State Management (Pinia)
All chunk data, selection state, and derived stats live in a single `useChunksStore`. Selection is managed as a `Set<string>` for O(1) toggle/lookup across 1,440 chunks. Computed properties derive all UI state reactively — no manual sync needed.

### Component Structure
```
pages/index.vue          # Page orchestration only
components/
  HourRow.vue            # One row = one hour (24 instances)
  HeatmapCell.vue        # One cell = one minute chunk
  DownloadModal.vue      # Download flow with signed URLs
  DeleteModal.vue        # Multi-step delete confirmation
  DashboardFooter.vue    # Sticky stats + color scale
stores/chunks.ts         # Single source of truth
composables/useFormatters.ts  # Pure formatting helpers
```

### Performance
- Each `HourRow` receives pre-built `chunkByMinute: Map<number, Chunk>` so cell rendering is O(1) lookup, not O(n) filter per cell
- `Set<string>` for `selectedIds` — toggling 1 of 1,440 items is constant time
- CSS-only animations — no JS animation overhead on the heatmap

### UX Decisions
- **Dark terminal aesthetic** — suited to a security operations context; reduces eye strain in dim NOC environments
- **Hover zoom on cells** — scale(1.4) on hover gives precise identification without a separate tooltip panel
- **Sticky header + footer** — action buttons always visible while scrolling 24 hours of data
- **Indeterminate checkbox state** — hour-level checkboxes show partial selection clearly
- **Snapshot on modal open** — delete modal captures selection at open time, so deselecting while modal is open doesn't silently change what gets deleted
- **Loading skeleton** — shimmer placeholders match the final grid shape, reducing layout shift
- **Corrupted chunk indicators** — red ring + `!` badge makes data integrity issues immediately visible

### API Layer
Nuxt server routes serve mock JSON files from `mock-data/`. Routes follow REST conventions:
- `GET /api/chunks` → full day data
- `POST /api/chunks/download-urls` → signed URLs for selected chunk IDs
- `DELETE /api/chunks` → delete selected chunks, returns freed bytes + errors

### Color Scale
8-level linear green gradient mapped between `minDataCount` and `maxDataCount` from the API meta. Empty minute slots (no chunk) render as near-transparent placeholders to preserve grid structure.
