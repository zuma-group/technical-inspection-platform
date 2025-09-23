const PDT_TIMEZONE = 'America/Los_Angeles'

export function formatPDT(date: Date | string | number, options?: Intl.DateTimeFormatOptions) {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', { timeZone: PDT_TIMEZONE, ...options }).format(d)
}

export function formatPDTDateTime(date: Date | string | number) {
  return formatPDT(date, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

export function formatPDTDate(date: Date | string | number) {
  return formatPDT(date, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function formatPDTTime(date: Date | string | number) {
  return formatPDT(date, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}


