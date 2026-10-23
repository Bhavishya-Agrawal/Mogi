const mongoose = require('mongoose');
const { PDFParse } = require('pdf-parse');
const Interview = require('../models/Interview');
const { generateJSON, transcribeAudio } = require('../utils/groq');
const { contextPrompt, scriptPrompt, evaluationPrompt } = require('../utils/prompts');
const { cleanScript, cleanResumeContext, applyEvaluation } = require('../utils/interviewHelpers');

const MAX_RESUME_CHARS = 15000;
const MAX_ANSWER_CHARS = 20000;

// Finds an interview that belongs to the logged-in user (or sends the right error)
async function findOwned(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: 'Interview not found' });
    return null;
  }
  const interview = await Interview.findOne({ _id: req.params.id, userId: req.user.userId });
  if (!interview) res.status(404).json({ error: 'Interview not found' });
  return interview;
}

// POST /api/interviews/start  (multipart: resume PDF)
async function startInterview(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload your resume as a PDF' });
  }
  // Real PDFs begin with "%PDF" - check the bytes, not just the extension
  if (req.file.buffer.subarray(0, 4).toString() !== '%PDF') {
    return res.status(400).json({ error: 'That file is not a PDF' });
  }

  // 1. Extract text from the PDF in memory. Nothing is written to disk.
  let resumeText;
  const parser = new PDFParse({ data: req.file.buffer });
  try {
    const pdfData = await parser.getText();
    resumeText = (pdfData.text || '').trim();
  } catch (error) {
    console.error('PDF parsing error:', error);
    return res.status(422).json({ error: 'We could not read that PDF. Try exporting it again.' });
  } finally {
    await parser.destroy();
  }

  if (resumeText.length < 100) {
    return res.status(422).json({ error: 'No readable text found. Scanned or image-only PDFs are not supported.' });
  }

  // 2. Resume text -> structured context
  let resumeContext;
  try {
    const raw = await generateJSON(contextPrompt(resumeText.slice(0, MAX_RESUME_CHARS)));
    resumeContext = cleanResumeContext(raw);
  } catch (error) {
    console.error('Groq resume context error:', error);
    return res.status(502).json({ error: 'The AI could not read your resume. Please try again.' });
  }

  // 3. Structured context -> interview script
  let script;
  try {
    const raw = await generateJSON(scriptPrompt(JSON.stringify(resumeContext)));
    script = cleanScript(raw);
  } catch (error) {
    console.error('Groq interview script error:', error);
    return res.status(502).json({ error: 'The AI could not write your interview. Please try again.' });
  }

  // 4. Save
  const count = await Interview.countDocuments({ userId: req.user.userId });
  const interview = await Interview.create({
    userId: req.user.userId,
    title: `Interview-${String(count + 1).padStart(2, '0')}`,
    resumeContext,
    script,
    status: 'IN_PROGRESS',
  });

  return res.status(201).json({ interviewId: interview._id });
}

// GET /api/interviews - lightweight list for the sidebar
async function listInterviews(req, res) {
  const interviews = await Interview.find({ userId: req.user.userId })
    .sort({ createdAt: -1 })
    .select('title status createdAt resumeContext.skills');
  res.json({ interviews });
}

// GET /api/interviews/:id
async function getInterview(req, res) {
  const interview = await findOwned(req, res);
  if (interview) res.json({ interview });
}

// PATCH /api/interviews/:id  { title }
async function renameInterview(req, res) {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title || title.length > 40) {
    return res.status(400).json({ error: 'Title must be between 1 and 40 characters' });
  }
  const interview = await findOwned(req, res);
  if (!interview) return;
  interview.title = title;
  await interview.save();
  res.json({ title: interview.title });
}

// PUT /api/interviews/:id/answers/:index  { userAnswer, timeTakenSeconds }
async function saveAnswer(req, res) {
  const interview = await findOwned(req, res);
  if (!interview) return;

  if (interview.status !== 'IN_PROGRESS') {
    return res.status(409).json({ error: 'This interview is no longer accepting answers' });
  }
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0 || index >= interview.script.length) {
    return res.status(400).json({ error: 'Invalid question number' });
  }

  const { userAnswer, timeTakenSeconds } = req.body || {};
  const node = interview.script[index];
  if (node.type === 'VOICE' && req.body?.voiceRecordingPending === true) {
    node.userAnswer = null;
    node.voiceRecordingPending = true;
  } else {
    node.userAnswer = typeof userAnswer === 'string' ? userAnswer.slice(0, MAX_ANSWER_CHARS) : '';
    node.voiceRecordingPending = false;
  }
  node.timeTakenSeconds = Math.min(Math.max(Number(timeTakenSeconds) || 0, 0), node.timeLimitSeconds);
  await interview.save();

  res.json({ saved: true });
}

// POST /api/interviews/:id/answers/:index/transcribe (multipart: audio)
async function transcribeVoiceAnswer(req, res) {
  const interview = await findOwned(req, res);
  if (!interview) return;

  if (interview.status !== 'IN_PROGRESS') {
    return res.status(409).json({ error: 'This interview is no longer accepting answers' });
  }
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0 || index >= interview.script.length) {
    return res.status(400).json({ error: 'Invalid question number' });
  }

  const question = interview.script[index];
  if (question.type !== 'VOICE') {
    return res.status(400).json({ error: 'Only voice answers can be transcribed' });
  }
  if (question.userAnswer !== null) {
    return res.json({ transcript: question.userAnswer, alreadyTranscribed: true });
  }
  if (!question.voiceRecordingPending) {
    return res.status(409).json({ error: 'No saved voice recording is pending for this question' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload the saved voice recording' });
  }
  if (!req.file.mimetype.startsWith('audio/') || !req.file.size) {
    return res.status(400).json({ error: 'The uploaded voice recording is empty or invalid' });
  }

  let transcript;
  try {
    transcript = await transcribeAudio(req.file.buffer, req.file.originalname, req.file.mimetype);
  } catch (error) {
    console.error('Groq voice transcription error:', error);
    return res.status(502).json({ error: 'Transcription failed. Your saved recording is safe; please try again.' });
  }

  question.userAnswer = transcript.slice(0, MAX_ANSWER_CHARS);
  question.voiceRecordingPending = false;
  await interview.save();
  return res.json({ transcript: question.userAnswer });
}

// POST /api/interviews/:id/finish - grade the whole interview
async function finishInterview(req, res) {
  const interview = await findOwned(req, res);
  if (!interview) return;

  if (interview.status === 'COMPLETED') return res.json({ interview });

  if (interview.script.some((q) => q.userAnswer === null && !q.voiceRecordingPending)) {
    return res.status(409).json({ error: 'Answer every question before finishing' });
  }
  if (interview.script.some((q) => q.voiceRecordingPending)) {
    return res.status(409).json({ error: 'Transcribe every saved voice recording before grading' });
  }

  interview.status = 'EVALUATING';
  await interview.save();

  try {
    const payload = interview.script.map((q, i) => ({
      index: i,
      type: q.type,
      question: q.questionText,
      starterCode: q.starterCode || undefined,
      answer: q.userAnswer && q.userAnswer.trim() ? q.userAnswer : '(no answer given)',
      secondsUsed: q.timeTakenSeconds,
      secondsAllowed: q.timeLimitSeconds,
    }));

    const evaluation = await generateJSON(evaluationPrompt(JSON.stringify(payload)));
    interview.report = applyEvaluation(interview.script, evaluation);
    interview.status = 'COMPLETED';
    await interview.save();
    return res.json({ interview });
  } catch (error) {
    console.error('Groq evaluation error:', error);
    // Put it back so the candidate can press "Finish" again
    interview.status = 'IN_PROGRESS';
    await interview.save();
    return res.status(502).json({ error: 'Grading failed. Your answers are saved - please try again.' });
  }
}

module.exports = {
  startInterview,
  listInterviews,
  getInterview,
  renameInterview,
  saveAnswer,
  transcribeVoiceAnswer,
  finishInterview,
};
