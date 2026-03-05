export function useFormatters() {
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  function formatRecords(count: number): string {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
    return count.toLocaleString()
  }

  function formatNumber(n: number): string {
    return n.toLocaleString()
  }

  function formatRatio(ratio: number): string {
    return `${ratio.toFixed(1)}x`
  }

  function formatTime(hour: number, minute: number): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  return { formatBytes, formatRecords, formatNumber, formatRatio, formatTime }
}
