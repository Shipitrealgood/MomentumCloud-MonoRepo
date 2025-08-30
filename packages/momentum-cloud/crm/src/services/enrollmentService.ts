import {
  PrismaClient,
  Enrollment,
  ElectionStatus,
  Prisma,
} from '@prisma/client';
import { isValid, parseISO } from 'date-fns';

const prisma = new PrismaClient();

export type CreateEnrollmentData = {
    contactId: string;
    policyId: string;
    status: ElectionStatus;
    effectiveDate: Date | string;
};

export type UpdateEnrollmentData = {
    status?: ElectionStatus;
    effectiveDate?: Date | string;
    terminationDate?: Date | string;
}

export class EnrollmentService {
    private static normalizeDate(input?: Date | string): Date | undefined {
        if (!input) return undefined;
        if (input instanceof Date) return input;
        const parsed = parseISO(input);
        return isValid(parsed) ? parsed : undefined;
    }

    public static async createEnrollment(data: CreateEnrollmentData): Promise<Enrollment> {
        const contact = await prisma.contact.findUnique({ where: { id: data.contactId } });
        if (!contact) {
            throw new Error(`Contact with ID "${data.contactId}" not found.`);
        }

        const policy = await prisma.policy.findUnique({ where: { id: data.policyId } });
        if (!policy) {
            throw new Error(`Policy with ID "${data.policyId}" not found.`);
        }

        const effectiveDate = this.normalizeDate(data.effectiveDate);
        if (!effectiveDate) {
            throw new Error("Invalid effective date format for enrollment.");
        }

        return prisma.enrollment.create({
            data: {
                contactId: data.contactId,
                policyId: data.policyId,
                status: data.status,
                effectiveDate,
            }
        });
    }

    public static async findEnrollmentById(id: string): Promise<Enrollment | null> {
        return prisma.enrollment.findUnique({
            where: { id },
            include: {
                contact: true,
                policy: true,
            }
        });
    }

    public static async listEnrollmentsByContact(contactId: string): Promise<Enrollment[]> {
        return prisma.enrollment.findMany({
            where: { contactId },
            include: {
                policy: {
                    include: {
                        carrier: true,
                    }
                }
            },
            orderBy: { effectiveDate: 'desc' }
        });
    }

    public static async updateEnrollment(id: string, data: UpdateEnrollmentData): Promise<Enrollment> {
        const updatePayload: Prisma.EnrollmentUpdateInput = { ...data };

        if (data.effectiveDate) {
            updatePayload.effectiveDate = this.normalizeDate(data.effectiveDate);
        }
        if (data.terminationDate) {
            updatePayload.terminationDate = this.normalizeDate(data.terminationDate);
        }

        return prisma.enrollment.update({
            where: { id },
            data: updatePayload,
        });
    }

    public static async terminateEnrollment(enrollmentId: string, terminationDate: Date | string): Promise<Enrollment> {
        const termDate = this.normalizeDate(terminationDate);
        if (!termDate) {
            throw new Error("Invalid termination date format.");
        }

        return prisma.enrollment.update({
            where: { id: enrollmentId },
            data: {
                status: ElectionStatus.TERMINATED,
                terminationDate: termDate,
            }
        });
    }
}
