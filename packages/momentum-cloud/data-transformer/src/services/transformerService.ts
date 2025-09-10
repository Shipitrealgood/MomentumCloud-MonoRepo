import { PrismaClient, DataTemplate } from '../../prisma/generated/client/index.js';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const prisma = new PrismaClient();

export type FieldMappingPayload = {
  sourceField: string;
  destinationField: string;
  description?: string;
};

export class TransformerService {
  // --- Existing methods (createTemplateFromCsv, defineTemplateMappings, findTemplateByKey) remain here ---
  
  /**
   * Ingests a sample CSV file to create a new template schema.
   * @param templateKey A unique key for the new template.
   * @param name A human-readable name for the template.
   * @param type IMPORT or EXPORT.
   * @param fileContent The string content of the sample CSV file.
   * @returns The newly created DataTemplate object.
   */
  public static async createTemplateFromCsv(
    templateKey: string,
    name: string,
    type: 'IMPORT' | 'EXPORT',
    fileContent: string
  ): Promise<DataTemplate> {
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      to: 1, // Only read the first data row to get headers
    });
    const headers = Object.keys(records[0] || {});

    if (headers.length === 0) {
      throw new Error('CSV file appears to be empty or has no headers.');
    }

    const template = await prisma.dataTemplate.create({
      data: {
        templateKey,
        name,
        type,
      },
    });

    console.log(`Created template '${name}' with key '${templateKey}'. Headers found: ${headers.join(', ')}`);
    return template;
  }

  /**
   * Defines the field mappings for an existing template.
   * This will overwrite any existing mappings.
   * @param templateKey The key of the template to update.
   * @param mappings An array of source-to-destination field mappings.
   */
  public static async defineTemplateMappings(templateKey: string, mappings: FieldMappingPayload[]): Promise<DataTemplate> {
    return prisma.$transaction(async (tx) => {
      const template = await tx.dataTemplate.findUniqueOrThrow({ where: { templateKey } });
      await tx.dataTemplateField.deleteMany({ where: { templateId: template.id } });
      await tx.dataTemplateField.createMany({
        data: mappings.map(m => ({
          templateId: template.id,
          sourceField: m.sourceField,
          destinationField: m.destinationField,
          description: m.description,
        })),
      });
      return tx.dataTemplate.findUniqueOrThrow({
        where: { templateKey },
        include: { fields: true },
      });
    });
  }

  /**
   * Finds a template by its key.
   * @param templateKey The key of the template to find.
   */
  public static async findTemplateByKey(templateKey: string) {
    return prisma.dataTemplate.findUnique({
      where: { templateKey },
      include: { fields: true },
    });
  }

  // --- NEW TRANSFORMATION METHODS ---

  /**
   * Transforms a raw CSV string into an array of canonical JSON objects.
   * @param templateKey The IMPORT template to use for the mapping.
   * @param csvContent The raw CSV data as a string.
   * @returns An array of transformed objects.
   */
  public static async transformCsv(templateKey: string, csvContent: string): Promise<any[]> {
    const template = await this.findTemplateByKey(templateKey);
    if (!template || template.type !== 'IMPORT' || !template.fields.length) {
      throw new Error(`Valid IMPORT template with key "${templateKey}" not found or has no mappings.`);
    }

    const records: any[] = parse(csvContent, { columns: true, skip_empty_lines: true });
    const mapping = new Map(template.fields.map(f => [f.sourceField, f.destinationField]));

    return records.map(record => {
      const newObj: { [key: string]: any } = {};
      for (const sourceField in record) {
        if (mapping.has(sourceField)) {
          const destinationField = mapping.get(sourceField)!;
          // This simple mapping can be extended later to handle nested objects if needed
          newObj[destinationField] = record[sourceField] || null;
        }
      }
      return newObj;
    });
  }

  /**
   * Transforms an array of canonical JSON objects into a CSV string.
   * @param templateKey The EXPORT template to use for the mapping.
   * @param data The array of canonical data.
   * @returns A CSV formatted string.
   */
  public static async transformToCsv(templateKey: string, data: any[]): Promise<string> {
    const template = await this.findTemplateByKey(templateKey);
    if (!template || template.type !== 'EXPORT' || !template.fields.length) {
      throw new Error(`Valid EXPORT template with key "${templateKey}" not found or has no mappings.`);
    }

    const mapping = new Map(template.fields.map(f => [f.sourceField, f.destinationField]));
    const headers = template.fields.map(f => f.destinationField);

    const exportedData = data.map(record => {
      const newObj: { [key: string]: any } = {};
      for (const sourceField of mapping.keys()) {
        const destinationField = mapping.get(sourceField)!;
        newObj[destinationField] = record[sourceField] || '';
      }
      return newObj;
    });

    return stringify(exportedData, { header: true, columns: headers });
  }
}