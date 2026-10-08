import { useCallback, useEffect, useRef, useState } from 'react'
import { getVoiceRecording, saveVoiceRecording } from '../lib/voiceRecordings'

const RECORDING_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

function preferredMimeType() {
  return RECORDING_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

export function useVoiceRecorder(interviewId, questionIndex) {
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const stopPromiseRef = useRef(null)
  const generationRef = useRef(0)
  const [recording, setRecording] = useState(false)
  const [starting, setStarting] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [error, setError] = useState('')

  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined' &&
    typeof indexedDB !== 'undefined'

  useEffect(() => {
    let active = true
    setHasRecording(false)
    setError('')
    getVoiceRecording(interviewId, questionIndex)
      .then((entry) => {
        if (active) setHasRecording(!!entry?.blob?.size)
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })
    return () => {
      active = false
      generationRef.current++
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [interviewId, questionIndex])

  const start = useCallback(async () => {
    if (!supported || starting || recording) return
    const generation = generationRef.current
    setError('')
    setStarting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      chunksRef.current = []
      const mimeType = preferredMimeType()
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 48000,
      })
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onerror = (event) => {
        const message = event.error?.message || 'The microphone recording failed.'
        setError(message)
        stopPromiseRef.current?.reject(new Error(message))
        stopPromiseRef.current = null
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' })
        chunksRef.current = []
        try {
          if (!blob.size) throw new Error('No audio was recorded. Please try again.')
          await saveVoiceRecording(interviewId, questionIndex, blob)
          setHasRecording(true)
          stopPromiseRef.current?.resolve(blob)
        } catch (saveError) {
          setError(saveError.message)
          stopPromiseRef.current?.reject(saveError)
        } finally {
          stopPromiseRef.current = null
        }
      }
      recorder.start()
      setRecording(true)
    } catch (startError) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setError(startError.message || 'Could not start microphone recording.')
    } finally {
      setStarting(false)
    }
  }, [interviewId, questionIndex, recording, starting, supported])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return Promise.resolve()
    const promise = new Promise((resolve, reject) => {
      stopPromiseRef.current = { resolve, reject }
    })
    try {
      recorder.stop()
    } catch (error) {
      stopPromiseRef.current = null
      return Promise.reject(error)
    }
    return promise
  }, [])

  const getRecording = useCallback(
    () => getVoiceRecording(interviewId, questionIndex),
    [interviewId, questionIndex]
  )

  return { supported, recording, starting, hasRecording, error, start, stop, getRecording }
}
