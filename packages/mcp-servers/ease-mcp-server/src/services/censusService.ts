// packages/mcp-servers/ease-mcp-server/src/services/censusService.ts

import { PrismaClient, Company, Employee } from '../../prisma/generated/client/index.js';
import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';
import { parse as dateParse, isValid } from 'date-fns';

const prisma = new PrismaClient();

// A type to describe the result of our reconciliation
export type ReconciliationResult = {
  companyName: string;
  employeesCreated: number;
  employeesUpdated: number;
  dependentsCreated: number;
  dependentsUpdated: number;
  errors: string[];
};

export class CensusService {

  /**
   * Parses a date string from the CSV into a JavaScript Date object.
   * Handles various common formats.
   */
  private static parseDate(dateStr: string | undefined | null): Date | null {
    if (!dateStr) return null;
    // Attempt to parse formats like "MM/DD/YYYY" or "M/D/YYYY"
    const parsedDate = dateParse(dateStr, 'M/d/yyyy', new Date());
    if (isValid(parsedDate)) {
      return parsedDate;
    }
    return null;
  }
  
  /**
   * The core reconciliation logic. Reads a census file, compares it to the database,
   * and synchronizes the data.
   * @param filePath The path to the downloaded census CSV file.
   * @param companyName The name of the company for which the census is being processed.
   * @returns A summary of the changes made to the database.
   */
  public static async reconcileCensusData(filePath: string, companyName: string): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      companyName,
      employeesCreated: 0,
      employeesUpdated: 0,
      dependentsCreated: 0,
      dependentsUpdated: 0,
      errors: [],
    };

    // 1. Read and parse the CSV file
    const fileContent = await fs.readFile(filePath);
    const records: any[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // 2. Find or create the parent company record
    let company = await prisma.company.upsert({
      where: { name: companyName },
      update: {},
      create: { name: companyName },
    });

    // 3. Process each row in the census
    for (const record of records) {
      const isEmployee = record['Relationship']?.toLowerCase() === 'employee';
      const eid = record['EID'];

      if (isEmployee && eid) {
        // --- Process an Employee Record ---
        const employeeData = {
          firstName: record['First Name'],
          lastName: record['Last Name'],
          middleName: record['Middle Name'],
          ssn: record['SSN'],
          birthDate: this.parseDate(record['Birth Date']),
          gender: record['Sex'],
          maritalStatus: record['Marital Status'],
          email: record['Email'],
          personalEmail: record['Personal Email'],
          address1: record['Address 1'],
          address2: record['Address 2'],
          city: record['City'],
          state: record['State'],
          zipCode: record['Zip Code'],
          county: record['County'],
          hireDate: this.parseDate(record['Hire Date']),
          status: record['Status'],
          jobTitle: record['Job Title'],
          companyId: company.id,
        };

        try {
          const upsertedEmployee = await prisma.employee.upsert({
            where: { eid },
            update: employeeData,
            create: { ...employeeData, eid },
          });

          // Check if the record was created or just updated
          if (upsertedEmployee.createdAt.getTime() === upsertedEmployee.updatedAt.getTime()) {
            result.employeesCreated++;
          } else {
            result.employeesUpdated++;
          }
        } catch (e: any) {
            result.errors.push(`Failed to process employee with EID ${eid}: ${e.message}`);
        }
      } else if (!isEmployee && eid) {
        // --- Process a Dependent Record ---
        // (Logic for dependents can be added here in the future)
      }
    }
    
    console.log(`Reconciliation complete for ${companyName}.`, result);
    return result;
  }
}