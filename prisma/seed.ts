import { PrismaClient, UserRole, QualityGrade, ListingStatus, MatchStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tradelink.gh' },
    update: {},
    create: {
      email: 'admin@tradelink.gh',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      verified: true,
    },
  })

  console.log('✅ Created admin user')

  // Create sample farmers
  const farmerUsers = []
  const regions = ['Ashanti', 'Greater Accra', 'Western', 'Eastern', 'Central']
  const districts = ['Kumasi', 'Ejisu', 'Asante Mampong', 'Accra', 'Tema', 'Takoradi', 'Cape Coast']
  const crops = ['Cocoa', 'Coffee', 'Cashew', 'Shea Nuts', 'Palm Oil']

  for (let i = 1; i <= 10; i++) {
    const password = await bcrypt.hash('farmer123', 12)
    const user = await prisma.user.upsert({
      where: { email: `farmer${i}@example.com` },
      update: {},
      create: {
        email: `farmer${i}@example.com`,
        password,
        firstName: `Farmer${i}`,
        lastName: `Last${i}`,
        role: UserRole.FARMER,
        phone: `+233${200000000 + i}`,
        verified: i % 2 === 0,
      },
    })

    const farmer = await prisma.farmer.upsert({
      where: { userId: user.id },
      update: {
        businessName: `Farm ${i} Cooperative`,
        location: `Location ${i}`,
        district: districts[i % districts.length],
        region: regions[i % regions.length],
        farmSize: 10 + i * 5,
        certifications: i % 2 === 0 ? ['Organic', 'Fair Trade'] : ['Organic'],
        mobileMoneyNumber: `0${500000000 + i}`,
      },
      create: {
        userId: user.id,
        businessName: `Farm ${i} Cooperative`,
        location: `Location ${i}`,
        district: districts[i % districts.length],
        region: regions[i % regions.length],
        farmSize: 10 + i * 5,
        certifications: i % 2 === 0 ? ['Organic', 'Fair Trade'] : ['Organic'],
        mobileMoneyNumber: `0${500000000 + i}`,
      },
    })

    farmerUsers.push({ user, farmer })
  }

  console.log('✅ Created 10 farmers')

  // Create sample buyers
  const buyerUsers = []
  const countries = ['Switzerland', 'United Kingdom', 'Netherlands', 'USA', 'UAE']
  const industries = ['Chocolate Manufacturing', 'Coffee Roasting', 'Food Processing', 'Retail', 'Export']

  for (let i = 1; i <= 5; i++) {
    const password = await bcrypt.hash('buyer123', 12)
    const user = await prisma.user.upsert({
      where: { email: `buyer${i}@example.com` },
      update: {},
      create: {
        email: `buyer${i}@example.com`,
        password,
        firstName: `Buyer${i}`,
        lastName: `Company${i}`,
        role: UserRole.BUYER,
        phone: `+1${2000000000 + i}`,
        verified: true,
      },
    })

    const buyer = await prisma.buyer.upsert({
      where: { userId: user.id },
      update: {
        companyName: `${countries[i - 1]} Trading Co.`,
        country: countries[i - 1],
        industry: industries[i - 1],
        website: `https://buyer${i}.example.com`,
        companySize: i % 2 === 0 ? 'Large' : 'Medium',
        seekingCrops: [crops[i % crops.length]],
        volumeRequired: `${20 + i * 10} tons/month`,
        qualityStandards: ['PREMIUM', 'GRADE_A'],
      },
      create: {
        userId: user.id,
        companyName: `${countries[i - 1]} Trading Co.`,
        country: countries[i - 1],
        industry: industries[i - 1],
        website: `https://buyer${i}.example.com`,
        companySize: i % 2 === 0 ? 'Large' : 'Medium',
        seekingCrops: [crops[i % crops.length]],
        volumeRequired: `${20 + i * 10} tons/month`,
        qualityStandards: ['PREMIUM', 'GRADE_A'],
      },
    })

    buyerUsers.push({ user, buyer })
  }

  console.log('✅ Created 5 buyers')

  // Create sample listings (skip if already exist for this farmer)
  const listings = []
  for (let i = 0; i < farmerUsers.length; i++) {
    const { farmer } = farmerUsers[i]
    const crop = crops[i % crops.length]
    const qualityGrades: QualityGrade[] = ['PREMIUM', 'GRADE_A', 'GRADE_B', 'STANDARD']

    // Check existing listings for this farmer
    const existingListings = await prisma.listing.findMany({
      where: { farmerId: farmer.id },
    })

    // Only create if we don't have enough listings
    if (existingListings.length < 2) {
      for (let j = existingListings.length; j < 2; j++) {
        try {
          const listing = await prisma.listing.create({
            data: {
              farmerId: farmer.id,
              cropType: crop,
              cropVariety: `${crop} Variety ${j + 1}`,
              quantity: 10 + Math.random() * 50,
              unit: 'tons',
              qualityGrade: qualityGrades[j % qualityGrades.length],
              pricePerUnit: 1000 + Math.random() * 2000,
              availableFrom: new Date(),
              availableUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              description: `High quality ${crop} from ${farmer.region} region`,
              images: [],
              certifications: farmer.certifications,
              status: ListingStatus.ACTIVE,
            },
          })
          listings.push(listing)
        } catch (error) {
          console.warn(`⚠️  Skipped creating duplicate listing for farmer ${farmer.id}`)
        }
      }
    } else {
      // Use existing listings
      listings.push(...existingListings.slice(0, 2))
    }
  }

  console.log('✅ Created/verified sample listings')

  // Create sample matches (skip if already exist)
  const existingMatches = await prisma.match.findMany()
  if (existingMatches.length < 5) {
    for (let i = existingMatches.length; i < 5 && i < listings.length; i++) {
      try {
        const listing = listings[i]
        const buyer = buyerUsers[i % buyerUsers.length].buyer
        const farmer = farmerUsers[i % farmerUsers.length].farmer

        await prisma.match.create({
          data: {
            listingId: listing.id,
            farmerId: farmer.id,
            buyerId: buyer.id,
            compatibilityScore: 70 + Math.random() * 25,
            estimatedValue: listing.quantity * listing.pricePerUnit,
            status: MatchStatus.SUGGESTED,
            aiRecommendation: JSON.stringify({
              reasons: [
                `Crop type matches buyer requirements: ${listing.cropType}`,
                `Quality grade (${listing.qualityGrade}) meets buyer standards`,
                'High compatibility score - excellent match',
              ],
            }),
          },
        })
      } catch (error) {
        console.warn(`⚠️  Skipped creating duplicate match ${i}`)
      }
    }
  }

  console.log('✅ Created/verified sample matches')

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

