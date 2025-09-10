import { Router } from 'express';
import { TransformerService } from '../services/transformerService.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Route for IMPORTING data (CSV file -> JSON)
router.post('/import/:templateKey', upload.single('file'), async (req, res) => {
  try {
    const { templateKey } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'A file is required for import.' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const canonicalData = await TransformerService.transformCsv(templateKey, fileContent);
    
    res.status(200).json(canonicalData);
  } catch (error: any) {
    res.status(400).json({ message: `Error transforming data for template '${req.params.templateKey}'.`, error: error.message });
  }
});

// Route for EXPORTING data (JSON -> CSV string)
router.post('/export/:templateKey', async (req, res) => {
    try {
      const { templateKey } = req.params;
      const data = req.body.data;
  
      if (!Array.isArray(data)) {
        return res.status(400).json({ message: 'Request body must include a "data" array.' });
      }
  
      const csvString = await TransformerService.transformToCsv(templateKey, data);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="export_${templateKey}_${Date.now()}.csv"`);
      res.status(200).send(csvString);

    } catch (error: any) {
      res.status(400).json({ message: `Error exporting data for template '${req.params.templateKey}'.`, error: error.message });
    }
  });

export { router as transformRoutes };