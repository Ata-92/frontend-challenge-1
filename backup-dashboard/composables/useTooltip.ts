import type { Chunk } from '~/types'

type TooltipHandler = {
  show: (chunk: Chunk, event: MouseEvent) => void
  hide: () => void
  position: (event: MouseEvent) => void
}

const handler = ref<TooltipHandler | null>(null)

export function useTooltip() {
  function register(h: TooltipHandler) {
    handler.value = h
  }

  function showTooltip(chunk: Chunk, event: MouseEvent) {
    handler.value?.show(chunk, event)
  }

  function hideTooltip() {
    handler.value?.hide()
  }

  function moveTooltip(event: MouseEvent) {
    handler.value?.position(event)
  }

  return { register, showTooltip, hideTooltip, moveTooltip }
}
