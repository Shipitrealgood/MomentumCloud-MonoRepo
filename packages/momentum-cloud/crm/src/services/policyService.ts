import {
  PrismaClient,
  Policy,
  PolicyStatus,
  FundingType,
  Prisma,
} from '@prisma/client';
import { isValid, parseISO } from 'date-fns';

const prisma = new PrismaClient();

export type CreatePolicyData = {
  accountId: string;
  carrierId: string;
  policyName: string;
  groupNumber?: string;
  fundingType: FundingType;
  policyStatus?: PolicyStatus;
  effectiveDate: Date | string;
  endDate?: Date | string;
  policyTerm?: number;
};

export type UpdatePolicyData = Partial<Omit<CreatePolicyData, 'accountId' | 'carrierId'>>;

export class PolicyService {
    private static normalizeDate(input?: Date | string): Date | undefined {
        if (!input) return undefined;
        if (input instanceof Date) return input;
        const parsed = parseISO(input);
        return isValid(parsed) ? parsed : undefined;
    }

    public static async createPolicy(data: CreatePolicyData): Promise<Policy> {
        const account = await prisma.account.findUnique({ where: { id: data.accountId } });
        if (!account) {
            throw new Error(`Account with ID "${data.accountId}" not found.`);
        }

        const carrier = await prisma.carrier.findUnique({ where: { id: data.carrierId } });
        if (!carrier) {
            throw new Error(`Carrier with ID "${data.carrierId}" not found.`);
        }

        const effectiveDate = this.normalizeDate(data.effectiveDate);
        if (!effectiveDate) {
            throw new Error("Invalid effective date format.");
        }

        const endDate = this.normalizeDate(data.endDate);

        return prisma.policy.create({
            data: {
                ...data,
                effectiveDate,
                endDate,
                policyStatus: data.policyStatus || PolicyStatus.PENDING,
            },
        });
    }

    public static async findPolicyById(id: string): Promise<Policy | null> {
        return prisma.policy.findUnique({
            where: { id },
            include: {
                account: true,
                carrier: true,
            }
        });
    }

    public static async listPoliciesByAccount(accountId: string): Promise<Policy[]> {
        return prisma.policy.findMany({
            where: { accountId },
            include: {
                carrier: true,
            },
            orderBy: { effectiveDate: 'desc' }
        });
    }

    public static async updatePolicy(id: string, data: UpdatePolicyData): Promise<Policy> {
        if (Object.keys(data).length === 0) {
            throw new Error("No data provided to update.");
        }

        const updatePayload: Prisma.PolicyUpdateInput = { ...data };

        if (data.effectiveDate) {
            updatePayload.effectiveDate = this.normalizeDate(data.effectiveDate);
        }
        if (data.endDate) {
            updatePayload.endDate = this.normalizeDate(data.endDate);
        }

        return prisma.policy.update({
            where: { id },
            data: updatePayload,
        });
    }
}
