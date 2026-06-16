export function formatAuthError(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.'

  if (typeof error === 'string') return error

  if (error instanceof Error && error.message) return error.message

  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>
    if (typeof e.message === 'string' && e.message) return e.message
    if (typeof e.msg === 'string' && e.msg) return e.msg
    if (typeof e.error_description === 'string') return e.error_description
    if (typeof e.code === 'string') return `Error: ${e.code}`
  }

  return 'Something went wrong. Please try again.'
}
