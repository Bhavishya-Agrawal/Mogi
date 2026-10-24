# Mogi

An AI mock interview platform. Upload a resume PDF, and Mogi writes a 7-question interview from it
(spoken, written and whiteboard-code questions), runs it with a timer per question, then grades you.

**Stack:** MongoDB, Express, React (Vite), Node, Tailwind CSS v4, GroqCloud API, Monaco Editor, Web Speech API.

## Run it

You need Node 20+, a MongoDB instance (local or Atlas) and a GroqCloud API key.

```bash
npm run install:all          # installs server + client workspaces

cd server
copy .env.example .env       # then fill in MONGO_URI, JWT_SECRET and GROQ_API_KEY
```

Use two terminals from the project root:

```bash
npm run server               # API on http://localhost:5000
npm run client               # app on http://localhost:5173
```

The client dev server proxies `/api` to port 5000, so there is nothing else to configure locally.
Voice recording needs a browser with microphone access, IndexedDB and MediaRecorder (Chrome and Edge are supported).

## Deploy to Vercel

The repository is configured to deploy the React app and Express API together as a Vercel project. The API runs as a Node.js function, MongoDB connections are reused between warm invocations, and client-side routes fall back to the Vite app.

1. Push this repository to GitHub, then sign in to [Vercel](https://vercel.com/) and choose **Add New → Project**.
2. Import the repository. Leave **Root Directory** set to the repository root. Vercel reads `vercel.json` for the install command, client build output, API function, and SPA routing.
3. In the project's **Settings → Environment Variables**, add these values for **Production**, **Preview**, and **Development** as needed:

   | Name | Value |
   | --- | --- |
   | `MONGO_URI` | Your MongoDB Atlas connection string. In Atlas, allow connections from Vercel (or use `0.0.0.0/0` if you cannot use a fixed IP allowlist). |
   | `JWT_SECRET` | A long, random secret used to sign login tokens. |
   | `GROQ_API_KEY` | Your GroqCloud API key. |
   | `GROQ_MODEL` | Optional; defaults to `openai/gpt-oss-120b`. |

   Do not add `VITE_API_URL` for this setup: the deployed frontend calls `/api` on the same domain. The Groq and MongoDB credentials are server-only; do not prefix them with `VITE_`.
4. Click **Deploy**. Future pushes to the connected branch trigger new deployments. Set a custom domain under **Settings → Domains** if desired.
5. After deployment, open `https://<your-domain>/api/health`; a working API returns `{"status":"API is running"}`. Test account registration and one interview end-to-end.

Vercel Functions limit request payloads, so this deployment caps resume PDFs and individual voice recordings at 4 MB (other local/non-Vercel runs retain the 10 MB and 25 MB limits). Vercel functions can run for up to five minutes on the supported plans; this project configures that maximum because interview generation and transcription call external AI services. If your plan has a lower function-duration limit, reduce the `maxDuration` value in `vercel.json` to match it.

## Folder map

```
server/
  server.js                    app setup, local server entry point, error handler
  config/db.js                 MongoDB connection reused by Vercel function instances
  routes/                      auth.js, interviews.js (in-memory PDF/audio uploads)
  controllers/                 authController.js, interviewController.js
  models/                      User.js, Interview.js (script, answers and report in one document)
  middleware/authMiddleware.js JWT check
  utils/
    groq.js                    GroqCloud client, retry with backoff, JSON parsing
    prompts.js                 the three prompts (resume -> context, context -> script, grading)
    interviewHelpers.js        cleans AI output, applies grades, grade letter from average rating
client/src/
  pages/                       Home, Login, Register, Dashboard, Interview, Results, Settings
  components/                  Logo, PenCircle, UserMenu, UploadPanel, InterviewDetail, ...
  hooks/useVoiceRecorder.js    microphone -> local recording
  lib/                         api.js (axios + JWT), speech.js (browser text -> voice), voiceRecordings.js (IndexedDB)
  context/AuthContext.jsx
api/[...path].js               Vercel function entry point for the Express API
```

## How an interview flows

1. `POST /api/interviews/start` (PDF). Text is extracted in RAM, GroqCloud builds `resumeContext`, then the script. The PDF is never written to disk.
2. The interview room reads each question aloud with the browser's speech synthesis. For VOICE questions, answers are recorded and saved in IndexedDB on this device; the timer starts once playback ends.
3. Next / time-out saves answer progress. A refresh resumes the interview, and saved audio recordings remain available in the same browser.
4. Finish uploads pending recordings to the server one at a time for GroqCloud Whisper (`whisper-large-v3-turbo`) transcription. Each local recording is deleted after its transcript is safely saved. If transcription fails, completed transcripts stay saved and the remaining recordings can be retried.
5. After transcription, `POST /api/interviews/:id/finish` asks GroqCloud to grade all answers. The letter grade is computed from your average rating, not by the AI, so it stays consistent.

## What changed from your starter

- **Bug fixed:** the history route used `req.user._id` (always undefined). The token payload is `userId`.
- Removed the duplicate `bcryptjs` dependency (the code uses `bcrypt`).
- Login now also returns the user; added `GET/PUT /api/auth/me` for the profile menu and Settings page.
- Passwords need 8+ characters with a letter and a number (checked on both client and server).
- AI output is validated before saving (question types, time limits, minimum question count, missing grades).
- `Interview.title` (renameable), `language` per question (for editor highlighting) and `report` (replaces `overallFeedback`) added.
- GroqCloud model name is read from `GROQ_MODEL`, defaulting to `openai/gpt-oss-120b`.
- Token lifetime is 1 day instead of 2 hours so an interview does not expire halfway.
- The `/upload` route became the drop zone on the dashboard, matching your sketch.
- Keep `.env` private and rotate credentials if they are ever shared.

## Things to know

- GroqCloud may rate-limit requests. The server retries 429/5xx with backoff and the start route allows 5 interviews per 15 minutes per IP. Change it in `routes/interviews.js`.
- Voice recordings stay in browser IndexedDB until Finish, when they are uploaded one at a time to GroqCloud's Whisper transcription endpoint. Each local audio file is deleted after its transcript is saved to the interview. Audio is held in server memory only and is not stored in the database.
- Monaco loads from a CDN, so the code editor needs an internet connection.
- For a separately hosted API, set `VITE_API_URL` on the client build (for example `https://your-api.example.com/api`) and configure that host's environment and CORS policy. Mic access needs HTTPS in production.
- The contact email shown on the landing page is a placeholder in `client/src/config.js`.
