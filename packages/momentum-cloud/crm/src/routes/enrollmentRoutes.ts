import { Router } from 'express';
import { EnrollmentService } from '../services/enrollmentService.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const enrollment = await EnrollmentService.createEnrollment(req.body);
        res.status(201).json(enrollment);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const enrollment = await EnrollmentService.findEnrollmentById(req.params.id);
        if (enrollment) {
            res.status(200).json(enrollment);
        } else {
            res.status(404).json({ message: 'Enrollment not found' });
        }
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/by-contact/:contactId', async (req, res) => {
    try {
        const enrollments = await EnrollmentService.listEnrollmentsByContact(req.params.contactId);
        res.status(200).json(enrollments);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const enrollment = await EnrollmentService.updateEnrollment(req.params.id, req.body);
        res.status(200).json(enrollment);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/:id/terminate', async (req, res) => {
    try {
        const { terminationDate } = req.body;
        const enrollment = await EnrollmentService.terminateEnrollment(req.params.id, terminationDate);
        res.status(200).json(enrollment);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
