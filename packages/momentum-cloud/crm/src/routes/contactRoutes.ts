import { Router } from 'express';
import { ContactService } from '../services/contactService.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const contact = await ContactService.createContact(req.body);
        res.status(201).json(contact);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/search', async (req, res) => {
    try {
        const name = req.query.name as string;
        const contacts = await ContactService.searchContactsByName(name);
        res.status(200).json(contacts);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const contact = await ContactService.findContactById(req.params.id);
        if (contact) {
            res.status(200).json(contact);
        } else {
            res.status(404).json({ message: 'Contact not found' });
        }
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const contact = await ContactService.updateContact(req.params.id, req.body);
        res.status(200).json(contact);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await ContactService.deleteContact(req.params.id);
        res.status(204).send();
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/by-account/:accountId', async (req, res) => {
    try {
        const contacts = await ContactService.listContactsByAccount(req.params.accountId);
        res.status(200).json(contacts);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
