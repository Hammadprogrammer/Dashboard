import { NextResponse } from 'next/server'
import prisma  from '@/lib/prisma'

// GET all bookings
export async function GET() {
  const bookings = await prisma.booking.findMany({
    include: {
      user: true,
      trip: true,
    },
  })
  return NextResponse.json(bookings)
}

// CREATE booking
export async function POST(req: Request) {
  const body = await req.json()
  const booking = await prisma.booking.create({
    data: {
      userId: body.userId,
      tripId: body.tripId,
      status: body.status || "pending",
    },
  })
  return NextResponse.json(booking)
}
