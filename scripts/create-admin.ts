/**
 * Script to create an admin user
 * Usage: npx ts-node scripts/create-admin.ts
 * 
 * Or via npm: npm run create-admin
 */

import { PrismaClient, UserRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@tradelink.gh'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const firstName = process.env.ADMIN_FIRST_NAME || 'Admin'
  const lastName = process.env.ADMIN_LAST_NAME || 'User'

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    })

    if (existingAdmin) {
      console.log(`✅ Admin user already exists: ${email}`)
      console.log('You can login with these credentials:')
      console.log(`Email: ${email}`)
      console.log(`Password: ${password}`)
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: UserRole.ADMIN,
        verified: true,
      },
    })

    console.log('✅ Admin user created successfully!')
    console.log('\n📋 Login Credentials:')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
    console.log(`\n🔗 Login at: http://localhost:3000/login`)
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()

