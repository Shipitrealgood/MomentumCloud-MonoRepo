// packages/mcp-servers/ease-mcp-server/src/services/censusService.ts

import { PrismaClient } from '../../prisma/generated/client/index.js';
import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';
import { parse as dateParse, isValid } from 'date-fns';

const prisma = new PrismaClient();

export type ReconciliationResult = {
  companyName: string;
  employeesCreated: number;
  employeesUpdated: number;
  dependentsCreated: number;
  dependentsUpdated: number;
  errors: string[];
};

// Expected CSV headers (from ingest-census-template.ts)
const REQUIRED_CSV_HEADERS = [
  'EID',
  'First Name',
  'Last Name',
  'Relationship',
  'Zip',
  'Personal Phone',
  'Work Phone',
  'Employee Type',
  'Employee Status',
  'Pay Cycle',
  'Compensation',
  'Compensation Type',
  'Scheduled Hours',
];

export class CensusService {
  private static parseDate(dateStr: string | undefined | null): Date | null {
    if (!dateStr) return null;
    const parsedDate = dateParse(dateStr, 'M/d/yyyy', new Date());
    if (isValid(parsedDate)) {
      return parsedDate;
    }
    return null;
  }

  private static cleanCurrency(value: string | undefined | null): number | null {
    if (!value) return null;
    const cleaned = value.replace(/[^0-9.-]+/g, '');
    return parseFloat(cleaned) || null;
  }

  private static cleanNumber(value: string | undefined | null): number | null {
    if (!value) return null;
    return parseInt(value, 10) || null;
  }

  public static async reconcileCensusData(filePath: string, companyName: string): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      companyName,
      employeesCreated: 0,
      employeesUpdated: 0,
      dependentsCreated: 0,
      dependentsUpdated: 0,
      errors: [],
    };

    // Read and parse the CSV file
    const fileContent = await fs.readFile(filePath);
    const records: any[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Validate CSV headers
    const headers = Object.keys(records[0] || {});
    const missingHeaders = REQUIRED_CSV_HEADERS.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      result.errors.push(`CSV is missing required headers: ${missingHeaders.join(', ')}`);
      console.error(result.errors[result.errors.length - 1]);
      return result;
    }

    console.log(`Parsed ${records.length} rows from CSV. Sample row:`, JSON.stringify(records[0], null, 2));

    // Find or create the parent company
    let company = await prisma.company.upsert({
      where: { name: companyName },
      update: {},
      create: { name: companyName },
    });

    // Process each row
    for (const record of records) {
      const isEmployee = record['Relationship']?.toLowerCase() === 'employee';
      const eid = record['EID'];

      if (!eid) {
        result.errors.push(`Skipping row with missing EID: ${JSON.stringify(record)}`);
        continue;
      }

      if (isEmployee) {
        // Process Employee
        const employeeData = {
          eid,
          companyId: company.id,
          firstName: record['First Name'] || '',
          lastName: record['Last Name'] || '',
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
          zipCode: record['Zip'],
          county: record['County'],
          personalPhone: record['Personal Phone'],
          workPhone: record['Work Phone'],
          mobilePhone: record['Mobile Phone'],
          hireDate: this.parseDate(record['Hire Date']),
          terminationDate: this.parseDate(record['Termination Date']),
          employmentType: record['Employee Type'],
          status: record['Employee Status'],
          jobTitle: record['Job Title'],
          payCycle: record['Pay Cycle'],
          compensationAmount: this.cleanCurrency(record['Compensation']),
          compensationType: record['Compensation Type'],
          scheduledHours: this.cleanNumber(record['Scheduled Hours']),
        };

        try {
          const upsertedEmployee = await prisma.employee.upsert({
            where: {
              companyId_eid: {
                companyId: company.id,
                eid,
              },
            },
            update: employeeData,
            create: employeeData,
          });

          if (upsertedEmployee.createdAt.getTime() === upsertedEmployee.updatedAt.getTime()) {
            result.employeesCreated++;
          } else {
            result.employeesUpdated++;
          }
        } catch (e: any) {
          result.errors.push(`Failed to process employee with EID ${eid}: ${e.message}`);
        }
      } else {
        // Process Dependent
        const dependentData = {
          eid,
          firstName: record['First Name'] || '',
          lastName: record['Last Name'] || '',
          middleName: record['Middle Name'],
          ssn: record['SSN'],
          birthDate: this.parseDate(record['Birth Date']),
          gender: record['Sex'],
          relationship: record['Relationship'],
          employeeId: '',
        };

        try {
          // Find the parent employee by EID and companyId
          const employee = await prisma.employee.findUnique({ where: { companyId_eid: { companyId: company.id, eid } } });
          if (!employee) {
            result.errors.push(`Dependent with EID ${eid} skipped: No matching employee.`);
            continue;
          }
          dependentData.employeeId = employee.id;

          // Use SSN if available, otherwise use composite key based on employeeId
          const whereClause = dependentData.ssn
            ? { ssn: dependentData.ssn }
            : { employeeId_firstName_lastName_relationship: { employeeId: employee.id, firstName: dependentData.firstName, lastName: dependentData.lastName, relationship: dependentData.relationship } };

          const upsertedDependent = await prisma.dependent.upsert({
            where: whereClause,
            update: dependentData,
            create: dependentData,
          });

          if (upsertedDependent.createdAt.getTime() === upsertedDependent.updatedAt.getTime()) {
            result.dependentsCreated++;
          } else {
            result.dependentsUpdated++;
          }
        } catch (e: any) {
          result.errors.push(`Failed to process dependent with EID ${eid}: ${e.message}`);
        }
      }
    }

    console.log(`Reconciliation complete for ${companyName}.`, result);
    await prisma.$disconnect();
    return result;
  }
}