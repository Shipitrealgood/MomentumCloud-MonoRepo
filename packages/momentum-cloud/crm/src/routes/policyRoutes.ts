import { Router } from 'express';
import { PolicyService } from '../services/policyService.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const policy = await PolicyService.createPolicy(req.body);
        res.status(201).json(policy);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const policy = await PolicyService.findPolicyById(req.params.id);
        if (policy) {
            res.status(200).json(policy);
        } else {
            res.status(404).json({ message: 'Policy not found' });
        }
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/by-account/:accountId', async (req, res) => {
    try {
        const policies = await PolicyService.listPoliciesByAccount(req.params.accountId);
        res.status(200).json(policies);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const policy = await PolicyService.updatePolicy(req.params.id, req.body);
        res.status(200).json(policy);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
