import { PrismaClient, Account, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to capitalize the first letter of each word in a string
function toTitleCase(str: string): string {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}


// Define a type for the data needed to create an account
export type CreateAccountData = {
  name: string;
  type: AccountType;
  industry?: string;
  phone?: string;
  website?: string;
};

// Define a type for the data that can be updated
export type UpdateAccountData = Partial<Omit<CreateAccountData, 'type'>>; // Type cannot be changed

export class AccountService {
  /**
   * Creates a new account with advanced validation and data normalization.
   */
  public static async createAccount(data: CreateAccountData): Promise<Account> {
    if (!data.name) {
      throw new Error("Account name is required.");
    }
    const normalizedName = toTitleCase(data.name);
    const existingAccount = await prisma.account.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });
    if (existingAccount) {
      throw new Error(`An account with the name "${normalizedName}" already exists.`);
    }
    const formattedPhone = data.phone ? data.phone.replace(/\D/g, '') : undefined;
    if (data.website) {
      try {
        new URL(data.website);
      } catch (_) {
        throw new Error("Invalid website URL format.");
      }
    }
    const account = await prisma.account.create({
      data: {
        ...data,
        name: normalizedName,
        phone: formattedPhone,
      },
    });
    return account;
  }

  /**
   * Finds a single account by its unique ID.
   */
  public static async findAccountById(id: string): Promise<Account | null> {
    return prisma.account.findUnique({
      where: { id },
    });
  }

  /**
   * Searches for accounts by name (case-insensitive).
   */
  public static async findAccountsByName(name: string): Promise<Account[]> {
    if (!name) {
      return [];
    }
    
    return prisma.account.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive', // This makes the search case-insensitive
        },
      },
      take: 10, // Limit to the top 10 results
    });
  }

  /**
   * Updates an existing account's details.
   */
  public static async updateAccount(id: string, data: UpdateAccountData): Promise<Account> {
     if (Object.keys(data).length === 0) {
      throw new Error("No data provided to update.");
    }
    if (data.name) {
      data.name = toTitleCase(data.name);
    }
    return prisma.account.update({
      where: { id },
      data,
    });
  }
}