import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 })
  }

  const token = process.env.WAQI_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'AQI API not configured' }, { status: 503 })
  }

  try {
    const res = await fetch(
      `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`,
      { next: { revalidate: 1800 } } // cache 30 min
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'AQI fetch failed' }, { status: 502 })
    }

    const data = await res.json()

    if (data.status !== 'ok') {
      return NextResponse.json({ error: 'AQI data unavailable' }, { status: 502 })
    }

    const aqi = data.data.aqi

    function aqiCategory(val: number): { label: string; color: string } {
      if (val <= 50)  return { label: 'Good',                          color: '#2BA887' }
      if (val <= 100) return { label: 'Moderate',                      color: '#F5A623' }
      if (val <= 150) return { label: 'Unhealthy for sensitive groups', color: '#E07B00' }
      if (val <= 200) return { label: 'Unhealthy',                     color: '#D94F4F' }
      if (val <= 300) return { label: 'Very unhealthy',                color: '#8B3DC8' }
      return           { label: 'Hazardous',                           color: '#7E0023' }
    }

    const { label, color } = aqiCategory(aqi)

    return NextResponse.json({
      aqi,
      label,
      color,
      dominant_pollutant: data.data.dominentpol ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'AQI fetch failed' }, { status: 502 })
  }
}