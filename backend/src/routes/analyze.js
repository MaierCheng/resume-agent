const express = require('express');
const multer = require('multer');
const { extractTextFromPDF } = require('../services/pdfParser');
const { runPipeline } = require('../services/pipeline');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/analyze', upload.single('resume'), async (req, res) => {
  try {
    // Validate inputs
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a resume PDF' });
    }
    if (!req.body.jobDescription) {
      return res.status(400).json({ error: 'Please provide a job description' });
    }

    // Set up SSE (Server-Sent Events) for streaming progress
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Helper to send SSE events to frontend
    const sendEvent = (type, data) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    // Extract text from PDF
    sendEvent('progress', { step: 0, label: 'Extracting PDF text...' });
    const resumeText = await extractTextFromPDF(req.file.buffer);

    // Run the 5-step pipeline, streaming progress at each step
    const result = await runPipeline(
      resumeText,
      req.body.jobDescription,
      ({ step, label }) => sendEvent('progress', { step, label })
    );

    // Send final result
    sendEvent('result', { data: result });

    // End the stream
    res.end();

  } catch (error) {
    console.error('Pipeline error:', error.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

module.exports = router;