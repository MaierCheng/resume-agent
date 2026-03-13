const express = require('express');
const multer = require('multer');
const { extractTextFromPDF } = require('../services/pdfParser');
const { analyzeResumeWithJD } = require('../services/aiService');

const router = express.Router();

// Store uploaded file in memory (not on disk)
const upload = multer({ storage: multer.memoryStorage() });

router.post('/analyze', upload.single('resume'), async (req, res) => {
  try {
    // 1. Check that both resume and JD were provided
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a resume PDF' });
    }
    if (!req.body.jobDescription) {
      return res.status(400).json({ error: 'Please provide a job description' });
    }

    // 2. Extract text from the uploaded PDF
    const resumeText = await extractTextFromPDF(req.file.buffer);

    // 3. Send to OpenAI for analysis
    const result = await analyzeResumeWithJD(resumeText, req.body.jobDescription);

    // 4. Return the result to the frontend
    res.json({ success: true, data: result });

  } catch (error) {
    console.error('Analysis error:', error.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;