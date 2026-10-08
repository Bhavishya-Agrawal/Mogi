const TYPES = ['VOICE', 'TEXT', 'CODE'];
const DEFAULT_LIMITS = { VOICE: 120, TEXT: 240, CODE: 300 };

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// AI output is untrusted: normalise it before it touches the database.
function cleanScript(raw) {
  const list = Array.isArray(raw) ? raw : raw?.script || raw?.questions;
  if (!Array.isArray(list)) throw new Error('Script is not an array');

  const script = list
    .slice(0, 10)
    .map((q) => {
      const type = TYPES.includes(q?.type) ? q.type : 'VOICE';
      const limit = Number(q?.timeLimitSeconds);
      return {
        type,
        transition: String(q?.transition || '').trim() || 'Okay, next question.',
        questionText: String(q?.questionText || '').trim(),
        starterCode: type === 'CODE' ? String(q?.starterCode || '') : null,
        language: type === 'CODE' ? String(q?.language || 'javascript').toLowerCase() : 'javascript',
        timeLimitSeconds: Number.isFinite(limit) ? clamp(Math.round(limit), 45, 900) : DEFAULT_LIMITS[type],
      };
    })
    .filter((q) => q.questionText);

  if (script.length < 5) throw new Error('Script has too few questions');
  return script;
}

function cleanResumeContext(raw) {
  const asArray = (v) => (Array.isArray(v) ? v : []);
  return {
    skills: asArray(raw?.skills).map(String).slice(0, 40),
    projects: asArray(raw?.projects).slice(0, 10),
    experience: asArray(raw?.experience).slice(0, 10),
  };
}

function gradeFromAverage(avg) {
  if (avg >= 4.7) return 'A+';
  if (avg >= 4.3) return 'A';
  if (avg >= 3.8) return 'B+';
  if (avg >= 3.3) return 'B';
  if (avg >= 2.8) return 'C+';
  if (avg >= 2.3) return 'C';
  if (avg >= 1.6) return 'D';
  return 'F';
}

const strList = (v, max) => (Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean).slice(0, max) : []);

// Merges the AI evaluation into the script and builds the report card.
function applyEvaluation(script, evaluation) {
  const byIndex = new Map((evaluation?.questions || []).map((q) => [Number(q.index), q]));

  script.forEach((node, i) => {
    const answered = node.userAnswer && node.userAnswer.trim();
    if (!answered) {
      // Skipped answers are always a 1, no matter what the AI says
      node.rating = 1;
      node.feedback = 'No answer was given for this question.';
      return;
    }
    const graded = byIndex.get(i);
    if (!graded) throw new Error(`Evaluation is missing question ${i}`);
    node.rating = clamp(Math.round(Number(graded.rating) || 1), 1, 5);
    node.feedback = String(graded.feedback || '').trim() || 'No feedback was generated for this answer.';
  });

  const average = script.reduce((sum, q) => sum + q.rating, 0) / script.length;

  return {
    grade: gradeFromAverage(average),
    averageRating: Math.round(average * 10) / 10,
    summary: String(evaluation?.summary || '').trim(),
    strengths: strList(evaluation?.strengths, 3),
    gaps: strList(evaluation?.gaps, 3),
    roadmap: strList(evaluation?.roadmap, 6),
  };
}

module.exports = { cleanScript, cleanResumeContext, applyEvaluation, gradeFromAverage };
