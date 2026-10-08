import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Upload } from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import GeneratingOverlay from './GeneratingOverlay'

const MAX_BYTES = 4 * 1024 * 1024

// The dashboard's empty state: drop a resume PDF (or click) to start a new interview
export default function UploadPanel({ hasHistory }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function upload(file) {
    if (!file) return
    setError('')
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return setError('Please choose a PDF file.')
    }
    if (file.size > MAX_BYTES) return setError('That file is over 4 MB. Try a smaller PDF.')

    const body = new FormData()
    body.append('resume', file)
    setBusy(true)
    try {
      const { data } = await api.post('/interviews/start', body)
      navigate(`/interview/${data.interviewId}`)
    } catch (err) {
      setError(errorMessage(err, 'Could not create your interview.'))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-5 py-10">
      {busy && <GeneratingOverlay />}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          upload(e.dataTransfer.files?.[0])
        }}
        className={`rounded-3xl border-2 border-dashed border-ink px-6 py-14 text-center transition-colors sm:px-12 ${
          dragging ? 'bg-pen/10' : 'bg-sheet'
        }`}
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-paper">
          <FileText size={30} />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold sm:text-4xl">
          {hasHistory ? 'Attend another interview' : 'Attend your first interview'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          Upload your resume as a PDF, or drop it here. Mogi reads it in memory and does not keep the file.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            upload(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button className="btn btn-pen mt-8" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Upload size={18} /> Upload resume
        </button>

        {error && (
          <p role="alert" className="mx-auto mt-6 max-w-md rounded-xl border-2 border-pen bg-pen/10 px-4 py-3 font-medium text-pen-dark">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
