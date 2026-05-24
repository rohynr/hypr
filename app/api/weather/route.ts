import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 })
  }

  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Weather API not configured' }, { status: 503 })
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`,
      { next: { revalidate: 1800 } } // cache 30 min
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Weather fetch failed' }, { status: 502 })
    }

    const data = await res.json()

    return NextResponse.json({
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      condition: data.weather[0].main,
      description: data.weather[0].description,
      icon_code: data.weather[0].icon,
    })
  } catch {
    return NextResponse.json({ error: 'Weather fetch failed' }, { status: 502 })
  }
}