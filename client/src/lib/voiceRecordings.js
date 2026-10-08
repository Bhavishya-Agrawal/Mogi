const DATABASE_NAME = 'mogi-voice-recordings'
const STORE_NAME = 'recordings'
const DATABASE_VERSION = 1

let databasePromise

function openDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('This browser does not support local voice recording storage.'))
  }
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: 'key' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        databasePromise = undefined
        reject(request.error || new Error('Could not open local voice recording storage.'))
      }
      request.onblocked = () => {
        databasePromise = undefined
        reject(new Error('Local voice recording storage is blocked by another tab.'))
      }
    })
  }
  return databasePromise
}

function recordingKey(interviewId, questionIndex) {
  return `${interviewId}:${questionIndex}`
}

async function withStore(mode, operation) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const request = operation(transaction.objectStore(STORE_NAME))
    let result
    request.onsuccess = () => {
      result = request.result
    }
    request.onerror = () => reject(request.error || new Error('Local voice recording storage failed.'))
    transaction.oncomplete = () => resolve(result)
    transaction.onabort = () => reject(transaction.error || new Error('Local voice recording storage failed.'))
  })
}

export function saveVoiceRecording(interviewId, questionIndex, blob) {
  return withStore('readwrite', (store) =>
    store.put({
      key: recordingKey(interviewId, questionIndex),
      interviewId,
      questionIndex,
      blob,
      mimeType: blob.type,
      savedAt: Date.now(),
    })
  )
}

export function getVoiceRecording(interviewId, questionIndex) {
  return withStore('readonly', (store) => store.get(recordingKey(interviewId, questionIndex)))
}

export function deleteVoiceRecording(interviewId, questionIndex) {
  return withStore('readwrite', (store) => store.delete(recordingKey(interviewId, questionIndex)))
}
