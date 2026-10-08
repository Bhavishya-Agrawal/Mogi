const express = require('express');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const { protect } = require('../middleware/authMiddleware');
const {
  startInterview,
  listInterviews,
  getInterview,
  renameInterview,
  saveAnswer,
  transcribeVoiceAnswer,
  finishInterview,
} = require('../controllers/interviewController');

const router = express.Router();

// memoryStorage: the PDF lives in RAM only and is never written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
});

const startLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many interviews started. Please try again in a few minutes.' },
});

function handleResumeUpload(req, res, next) {
  upload.single('resume')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Resume must be 4 MB or smaller' });
    }
    return res.status(400).json({ error: 'Unable to process the resume upload' });
  });
}

function handleVoiceUpload(req, res, next) {
  audioUpload.single('audio')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Voice recording must be 4 MB or smaller' });
    }
    return res.status(400).json({ error: 'Unable to process the voice recording' });
  });
}

router.use(protect);

router.post('/start', startLimiter, handleResumeUpload, startInterview);
router.get('/', listInterviews);
router.get('/:id', getInterview);
router.patch('/:id', renameInterview);
router.put('/:id/answers/:index', saveAnswer);
router.post('/:id/answers/:index/transcribe', handleVoiceUpload, transcribeVoiceAnswer);
router.post('/:id/finish', finishInterview);

module.exports = router;
