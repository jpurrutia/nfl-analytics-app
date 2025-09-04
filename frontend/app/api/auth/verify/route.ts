import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const accessToken = cookieStore.get('access_token')
    
    if (!accessToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    // Use backend API directly from server-side
    // Use localhost when running outside Docker
    const apiUrl = process.env.BACKEND_URL || 'http://localhost:8080/api'
    
    // Verify with backend
    const response = await fetch(`${apiUrl}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken.value}`
      }
    })
    
    if (!response.ok) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    const userData = await response.json()
    return NextResponse.json({ authenticated: true, user: userData })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}