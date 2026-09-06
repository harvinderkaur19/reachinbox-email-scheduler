import { PrismaClient } from '@prisma/client';
import { config } from '../config';

let prismaInstance: PrismaClient | null = null;

export const getPrismaClient = (): PrismaClient => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: config.DATABASE_URL,
        },
      },
      log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaInstance;
};

export const connectPrisma = async (): Promise<void> => {
  const client = getPrismaClient();
  await client.$connect();
};

export const disconnectPrisma = async (): Promise<void> => {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
};
