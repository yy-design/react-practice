import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import prismaClient from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const { PrismaClient } = prismaClient

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl,
})

export const prisma = new PrismaClient({ adapter })
