import { Router } from 'express';
import { AccountService } from '../services/accountService.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const account = await AccountService.createAccount(req.body);
        res.status(201).json(account);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/search', async (req, res) => {
    try {
        const name = req.query.name as string;
        const accounts = await AccountService.findAccountsByName(name);
        res.status(200).json(accounts);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const account = await AccountService.findAccountById(req.params.id);
        if (account) {
            res.status(200).json(account);
        } else {
            res.status(404).json({ message: 'Account not found' });
        }
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const account = await AccountService.updateAccount(req.params.id, req.body);
        res.status(200).json(account);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
