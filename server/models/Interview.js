const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: { type: String, enum: ['VOICE', 'TEXT', 'CODE'], required: true },
  transition: { type: String, required: true }, // the interviewer's conversational bridge
  questionText: { type: String, required: true },
  starterCode: { type: String, default: null }, // only for CODE
  language: { type: String, default: 'javascript' }, // only used by the code editor
  timeLimitSeconds: { type: Number, required: true },

  // filled in while the candidate answers
  userAnswer: { type: String, default: null }, // null = not reached yet, '' = skipped
  timeTakenSeconds: { type: Number, default: 0 },
  voiceRecordingPending: { type: Boolean, default: false },

  // filled in by the evaluation step
  feedback: { type: String, default: null },
  rating: { type: Number, min: 1, max: 5, default: null },
});

const reportSchema = new mongoose.Schema(
  {
    grade: String,
    averageRating: Number,
    summary: String,
    strengths: [String],
    gaps: [String],
    roadmap: [String],
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'Interview', trim: true, maxlength: 40 },
  status: {
    type: String,
    enum: ['GENERATING', 'IN_PROGRESS', 'EVALUATING', 'COMPLETED'],
    default: 'GENERATING',
  },

  resumeContext: {
    skills: [String],
    experience: [{ type: mongoose.Schema.Types.Mixed }],
    projects: [{ type: mongoose.Schema.Types.Mixed }],
  },

  script: [questionSchema],
  report: { type: reportSchema, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Interview', interviewSchema);
