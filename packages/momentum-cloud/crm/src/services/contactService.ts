import {
  PrismaClient,
  Contact,
  ContactType,
  EmployeeProfile,
  IndividualProfile,
  EmploymentType,
  EmploymentStatus,
  CompensationType,
  RelationshipToAccountPrimary,
} from '@prisma/client';

const prisma = new PrismaClient();

// A comprehensive data structure for creating any type of contact
export type CreateContactData = {
  accountId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthdate?: Date;
  
  // To link dependents to a primary contact
  primaryContactId?: string;

  // --- Profile-Specific Data ---
  profile: {
    recordType: ContactType;
    // Employee-specific fields
    hireDate?: Date;
    employmentType?: EmploymentType;
    employmentStatus?: EmploymentStatus;
    compensationType?: CompensationType;
    compensationAmount?: number;
    title?: string;
    eid?: string;

    // Individual-specific fields (for household members/dependents)
    relationship?: RelationshipToAccountPrimary;
  };
};

// THE FIX: The return type is updated to allow profiles to be null.
export class ContactService {
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

    // --- Step 2: Use a Transaction for Data Integrity ---
    return prisma.$transaction(async (tx) => {
      // --- Step 3: Create the Base Contact Record ---
      const newContact = await tx.contact.create({
        data: {
          accountId: data.accountId,
          recordType: data.profile.recordType,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          birthdate: data.birthdate,
          primaryContactId: data.primaryContactId,
        },
      });

      // --- Step 4: Conditionally Create the Correct Profile ---
      if (data.profile.recordType === 'EMPLOYEE') {
        if (!data.profile.hireDate || !data.profile.employmentType || !data.profile.compensationType || !data.profile.compensationAmount) {
             throw new Error("For EMPLOYEE record type, hireDate, employmentType, compensationType and compensationAmount are required.");
        }
        await tx.employeeProfile.create({
          data: {
            contactId: newContact.id,
            hireDate: data.profile.hireDate,
            employmentType: data.profile.employmentType,
            employmentStatus: data.profile.employmentStatus || 'ACTIVE',
            compensationType: data.profile.compensationType,
            compensationAmount: data.profile.compensationAmount,
            title: data.profile.title,
            eid: data.profile.eid,
          },
        });
      } else if (data.profile.recordType === 'INDIVIDUAL') {
        if (!data.profile.relationship) {
            throw new Error("For INDIVIDUAL record type, a relationship is required.");
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
}