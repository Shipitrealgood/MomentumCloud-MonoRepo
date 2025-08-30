import { Router } from 'express';
import { CarrierService } from '../services/carrierService.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const carrier = await CarrierService.findOrCreateCarrier(req.body);
        res.status(201).json(carrier);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/search', async (req, res) => {
    try {
        const name = req.query.name as string;
        const carrier = await CarrierService.findCarrierByName(name);
        res.status(200).json(carrier);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
