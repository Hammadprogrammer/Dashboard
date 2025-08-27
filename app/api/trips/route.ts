import { NextResponse } from 'next/server'
import prisma  from '@/lib/prisma'

// GET all trips
export async function GET() {
  const trips = await prisma.trip.findMany({
    include: {
      bookings: true, // optional: bookings bhi chahiye to
    },
  })
  return NextResponse.json(trips)
}

// CREATE trip
export async function POST(req: Request) {
  const body = await req.json()
  const trip = await prisma.trip.create({
    data: {
      title: body.title,
      destination: body.destination,
      price: body.price,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    },
  })
  return NextResponse.json(trip)
}
