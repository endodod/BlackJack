import { PrismaClient } from '@prisma/client'
const globalForPrisma = global
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
export default prisma
