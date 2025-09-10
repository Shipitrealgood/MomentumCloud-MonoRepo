import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();
const port = process.env.DATA_TRANSFORMER_PORT || 3002; // Use a different port

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for file uploads

app.use('/api', routes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'Data Transformer' });
});

app.listen(port, () => {
    console.log(`✅ Data Transformer Service is running on http://localhost:${port}`);
});