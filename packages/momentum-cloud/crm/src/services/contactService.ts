import {
  PrismaClient,
  Contact,
  ContactType,
  EmployeeProfile,
  IndividualProfile,
  EmploymentType,
  EmploymentStatus,
  CompensationType,
  RelationshipToContact,
  Prisma,
} from '../../prisma/generated/client/index.js';
import { parseISO, isValid } from 'date-fns';  // Add date-fns for better parsing; npm i date-fns

const prisma = new PrismaClient();

// A comprehensive data structure for creating any type of contact
export type CreateContactData = {
  accountId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthdate?: Date | string;  // Allow string for flexible input
  
  // To link dependents to a primary contact
  primaryContactId?: string;

  // --- Profile-Specific Data ---
  profile: {
    type: ContactType;
    // Employee-specific fields
    hireDate?: Date | string;  // Allow string for flexible input
    employmentType?: EmploymentType;
    employmentStatus?: EmploymentStatus;
    compensationType?: CompensationType;
    compensationAmount?: Prisma.Decimal;
    title?: string;
    eid?: string;

    // Individual-specific fields (for household members/dependents)
    relationship?: RelationshipToContact;
  };
};

// THE FIX: The return type is updated to allow profiles to be null.
export class ContactService {
  private static normalizeDate(input?: Date | string): Date | undefined {
    if (!input) return undefined;
    if (input instanceof Date) return input;
    let parsed: Date | null = null;
    // Try YYYY-MM-DD
    parsed = parseISO(input);
    if (!isValid(parsed)) {
      // Try MM/DD/YYYY
      const parts = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (parts) {
        parsed = parseISO(`${parts[3]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
      }
    }
    return isValid(parsed) ? parsed : undefined;  // Return undefined if invalid
  }

  public static async createContact(data: CreateContactData): Promise<Contact & { employeeProfile: EmployeeProfile | null, individualProfile: IndividualProfile | null }> {
    // --- Step 1: Validation ---
    const account = await prisma.account.findUnique({ where: { id: data.accountId } });
    if (!account) {
      throw new Error(`Account with ID "${data.accountId}" not found.`);
    }
    
    if (data.primaryContactId) {
        const primaryContact = await prisma.contact.findUnique({ where: { id: data.primaryContactId } });
        if (!primaryContact) {
            throw new Error(`Primary contact with ID "${data.primaryContactId}" not found.`);
        }
    }

    // Normalize dates
    data.birthdate = this.normalizeDate(data.birthdate);
    if (data.profile.type === ContactType.Employee) {
      data.profile.hireDate = this.normalizeDate(data.profile.hireDate);
    }

    // --- Step 2: Use a Transaction for Data Integrity ---
    return prisma.$transaction(async (tx) => {
      // --- Step 3: Create the Base Contact Record ---
      const newContact = await tx.contact.create({
        data: {
          accountId: data.accountId,
          type: data.profile.type,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          birthdate: data.birthdate,
          primaryContactId: data.primaryContactId,
        },
      });

      // --- Step 4: Conditionally Create the Correct Profile ---
      if (data.profile.type === ContactType.Employee) {
        if (!data.profile.employmentType || !data.profile.compensationType || !data.profile.compensationAmount) {
             throw new Error("For Employee contact type, employmentType, compensationType and compensationAmount are required.");
        }
        if (data.profile.hireDate && !isValid(data.profile.hireDate)) {
          throw new Error("Invalid hireDate format for Employee.");
        }
        await tx.employeeProfile.create({
          data: {
            contactId: newContact.id,
            hireDate: data.profile.hireDate,
            employmentType: data.profile.employmentType,
            employmentStatus: data.profile.employmentStatus || EmploymentStatus.Active,
            compensationType: data.profile.compensationType,
            compensationAmount: data.profile.compensationAmount,
            title: data.profile.title,
            eid: data.profile.eid,
          },
        });
      } else if (data.profile.type === ContactType.Individual) {
        if (!data.profile.relationship) {
            throw new Error("For Individual contact type, a relationship is required.");
        }
        await tx.individualProfile.create({
          data: {
            contactId: newContact.id,
            relationship: data.profile.relationship,
          },
        });
      }

      // --- Step 5: Return the Full Contact with its New Profile ---
      // We query the contact again to get all the relations we just created
      return tx.contact.findUniqueOrThrow({
          where: { id: newContact.id },
          include: {
              employeeProfile: true,
              individualProfile: true,
          }
      });
    });
  }

  public static async findContactById(id: string) {
    return prisma.contact.findUnique({
        where: { id },
        include: {
            employeeProfile: true,
            individualProfile: true,
            account: true, // Also include the account they belong to
        }
    });
  }

  // New: Search contacts by name (first or last, case-insensitive)
  public static async searchContactsByName(name: string) {
    return prisma.contact.findMany({
      where: {
        OR: [
          { firstName: { contains: name, mode: 'insensitive' } },
          { lastName: { contains: name, mode: 'insensitive' } },
        ],
      },
      include: {
        employeeProfile: true,
        individualProfile: true,
        account: true,
      },
      orderBy: { lastName: 'asc' },
    });
  }

  // Additional method: List all contacts for an account
  public static async listContactsByAccount(accountId: string) {
    return prisma.contact.findMany({
      where: { accountId },
      include: {
        employeeProfile: true,
        individualProfile: true,
      },
      orderBy: { lastName: 'asc' },
    });
  }

  // Additional method: Update a contact's basic info
  public static async updateContact(id: string, updateData: Partial<Pick<Contact, 'firstName' | 'lastName' | 'email' | 'phone' | 'birthdate'>>) {
    return prisma.contact.update({
      where: { id },
      data: updateData,
      include: {
        employeeProfile: true,
        individualProfile: true,
      },
    });
  }

  // Additional method: Delete a contact (with cascade if needed, but Prisma handles relations)
  public static async deleteContact(id: string) {
    return prisma.$transaction(async (tx) => {
      // Delete profiles first if exist
      await tx.employeeProfile.deleteMany({ where: { contactId: id } });
      await tx.individualProfile.deleteMany({ where: { contactId: id } });
      // Delete enrollments, etc., if necessary
      await tx.enrollment.deleteMany({ where: { contactId: id } });
      // Then delete contact
      return tx.contact.delete({ where: { id } });
    });
  }
}