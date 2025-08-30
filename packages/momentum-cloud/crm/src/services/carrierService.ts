import { PrismaClient, Carrier } from '@prisma/client';

const prisma = new PrismaClient();

export type CreateCarrierData = {
  name: string;
  website?: string;
};

export class CarrierService {
  public static async findOrCreateCarrier(data: CreateCarrierData): Promise<Carrier> {
    const existingCarrier = await prisma.carrier.findUnique({
      where: { name: data.name },
    });

    if (existingCarrier) {
      return existingCarrier;
    }

    return prisma.carrier.create({
      data,
    });
  }

  public static async findCarrierByName(name: string): Promise<Carrier | null> {
    return prisma.carrier.findFirst({
        where: {
            name: {
                contains: name,
                mode: 'insensitive'
            }
        }
    })
  }
}
