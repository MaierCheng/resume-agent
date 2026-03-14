const express = require('express');
const { generateResumePDF, generateCoverLetterPDF } = require('../services/resumeGenerator');

const router = express.Router();

// Generate resume PDF
router.post('/generate-pdf', async (req, res) => {
  try {
    const { parsedResume, rewrittenResume, analyzedJD } = req.body;
    if (!parsedResume || !rewrittenResume || !analyzedJD) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const { pdfPath, folderName } = await generateResumePDF(parsedResume, rewrittenResume, analyzedJD);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resume_${folderName}.pdf"`);
    res.sendFile(pdfPath);

  } catch (error) {
    console.error('Resume PDF error:', error.message);
    res.status(500).json({ error: 'Failed to generate resume PDF: ' + error.message });
  }
});

// Generate cover letter PDF
router.post('/generate-cover-letter-pdf', async (req, res) => {
  try {
    const { coverLetterText, parsedResume, analyzedJD } = req.body;
    if (!coverLetterText || !parsedResume || !analyzedJD) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const { pdfPath, folderName } = await generateCoverLetterPDF(coverLetterText, parsedResume, analyzedJD);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cover_letter_${folderName}.pdf"`);
    res.sendFile(pdfPath);

  } catch (error) {
    console.error('Cover letter PDF error:', error.message);
    res.status(500).json({ error: 'Failed to generate cover letter PDF: ' + error.message });
  }
});

module.exports = router;