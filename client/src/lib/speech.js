export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel()
}

export function speak(text, onDone) {
  if (!canSpeak) {
    onDone?.()
    return
  }

  stopSpeaking()
  const chunks = text.match(/[^.!?]+[.!?]*/g)?.map((part) => part.trim()).filter(Boolean) || [text]
  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.lang = 'en-US'
    if (index === chunks.length - 1) {
      utterance.onend = () => onDone?.()
      utterance.onerror = () => onDone?.()
    }
    window.speechSynthesis.speak(utterance)
  })
}
