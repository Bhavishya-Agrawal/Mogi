export const MAX_RESUME_BYTES = Number(import.meta.env.VITE_MAX_RESUME_BYTES || 10 * 1024 * 1024)
export const MAX_AUDIO_BYTES = Number(import.meta.env.VITE_MAX_AUDIO_BYTES || 25 * 1024 * 1024)

export const MAX_RESUME_MB = MAX_RESUME_BYTES / 1024 / 1024
export const MAX_AUDIO_MB = MAX_AUDIO_BYTES / 1024 / 1024
