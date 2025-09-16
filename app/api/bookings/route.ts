import { NextResponse } from 'next/server'
import prisma  from '@/lib/prisma'

// GET 
export async function GET() {
  const bookings = await prisma.booking.findMany({
    include: {
      user: true,
      trip: true,
    },
  })
  return NextResponse.json(bookings)
}

// CREATE 
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
