import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = cookies()
  
  // Clear authentication cookies
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
  
  return NextResponse.json({ message: 'Logged out successfully' })
}