import { Router } from 'express';
import { TransformerService } from '../services/transformerService.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Route to find a template by its key
router.get('/:templateKey', async (req, res) => {
  try {
    const { templateKey } = req.params;
    const template = await TransformerService.findTemplateByKey(templateKey);
    if (!template) {
      return res.status(404).json({ message: 'Template not found.' });
    }
    res.status(200).json(template);
  } catch (error: any) {
    console.error(`Error finding template ${req.params.templateKey}:`, error);
    res.status(500).json({ message: 'Error finding template.', error: error.message });
  }
});

// Route for creating template shells via JSON
router.post('/', async (req, res) => {
    try {
        const { templateKey, name, type } = req.body;
        if (!templateKey || !name || !type) {
            return res.status(400).json({ message: 'Missing required fields: templateKey, name, type.' });
        }
        const template = await TransformerService.createTemplateFromCsv(templateKey, name, type, "header\nvalue");
        res.status(201).json(template);
    } catch (error: any) {
        console.error('Error creating template:', error);
        res.status(400).json({ message: 'Error creating template.', error: error.message });
    }
});


// Route ONLY for uploading a sample file for an IMPORT template
router.post('/ingest-file', upload.single('file'), async (req, res) => {
    try {
        const { templateKey, name } = req.body;
        if (!req.file || !templateKey || !name) {
            return res.status(400).json({ message: 'Missing required fields: file, templateKey, name.' });
        }
        
        const fileContent = req.file.buffer.toString('utf-8');
        const template = await TransformerService.createTemplateFromCsv(templateKey, name, 'IMPORT', fileContent);
        res.status(201).json(template);
    } catch (error: any) {
        console.error('Error creating template from file:', error);
        res.status(400).json({ message: 'Error creating template from file.', error: error.message });
    }
});


// Route to define or update the mappings for a template
router.put('/:templateKey/mappings', async (req, res) => {
  try { // Explicit try...catch block
    const { templateKey } = req.params;
    const mappings = req.body.mappings;

    if (!Array.isArray(mappings)) {
      return res.status(400).json({ message: 'Request body must include a "mappings" array.' });
    }
    
    const updatedTemplate = await TransformerService.defineTemplateMappings(templateKey, mappings);
    res.status(200).json(updatedTemplate);
  } catch (error: any) {
    // This block will now catch any error from the service/database
    console.error(`Error defining mappings for ${req.params.templateKey}:`, error);
    res.status(500).json({ message: 'Error defining template mappings.', error: error.message });
  }
});

export { router as templateRoutes };