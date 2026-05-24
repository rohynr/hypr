'use client'

import { useEffect, useState, useMemo } from 'react'
import { type Locality } from '@/components/LocationSelector'
import { LeftNavWrapper as LeftNav } from '@/components/LeftNav'
import { Header } from '@/components/Header'

const MUMBAI_CITY_ID = '49a211bc-0e51-4ae1-97af-1b1a4f6f0a4b'
const LOCALITY_STORAGE_KEY = 'hypr.locality'

type WeatherData = {
  temp: number
  feels_like: number
  humidity: number
  condition: string
  description: string
  icon_code: string
}

type AqiData = {
  aqi: number
  label: string
  color: string
  dominant_pollutant: string | null
}

type Alert = {
  id: string
  kind: string
  severity: 'info' | 'warning' | 'urgent'
  headline: string
  details: string | null
  affected_areas: string[]
  source: string
  starts_at: string
  ends_at: string | null
}

type Facility = {
  id: string
  kind: string
  name: string
  address_line: string
  phone: string | null
  is_24x7: boolean
}

type Event = {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
  venue: string
  category: string | null
}

// ─── Alert helpers ─────────────────────────────────────────────────────────────

const ALERT_KIND_LABEL: Record<string, string> = {
  water_cut:       'Water cut',
  power_outage:    'Power outage',
  road_closure:    'Road closure',
  weather_warning: 'Weather warning',
  civic_notice:    'Civic notice',
}

const SEVERITY_STYLE = {
  info:    { bg: '#F0F7FF', border: '#C8DEFF', dot: '#4A90D9', label: '#4A90D9' },
  warning: { bg: '#FFFBF0', border: '#FFE4A0', dot: '#E07B00', label: '#E07B00' },
  urgent:  { bg: '#FFF5F5', border: '#FFCDD0', dot: '#D94F4F', label: '#D94F4F' },
}

function formatEndsAt(endsAt: string | null) {
  if (!endsAt) return null
  const date = new Date(endsAt)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  return isToday
    ? `Until ${time} today`
    : `Until ${time}, ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
}

function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
      {alerts.map(alert => {
        const s = SEVERITY_STYLE[alert.severity]
        return (
          <div key={alert.id} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: s.label, fontFamily: 'var(--font-inter), Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {ALERT_KIND_LABEL[alert.kind] ?? alert.kind}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f0f0f', fontFamily: 'var(--font-inter), Arial, sans-serif', marginBottom: alert.details || alert.ends_at ? 4 : 0 }}>
              {alert.headline}
            </div>
            {alert.details && (
              <div style={{ fontSize: 13, color: '#555', fontFamily: 'var(--font-inter), Arial, sans-serif', marginBottom: 4, lineHeight: 1.5 }}>
                {alert.details}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              {alert.ends_at && (
                <span style={{ fontSize: 12, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                  {formatEndsAt(alert.ends_at)}
                </span>
              )}
              <span style={{ fontSize: 12, color: '#aaa', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                Source: {alert.source}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Essentials ───────────────────────────────────────────────────────────────

const FACILITY_META: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
  police_station: {
    label: 'Police',
    color: '#3B5BDB',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L3 7v5c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V7L12 2z"/></svg>,
  },
  fire_station: {
    label: 'Fire station',
    color: '#E03131',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>,
  },
  hospital: {
    label: 'Hospital',
    color: '#2BA887',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>,
  },
  ward_office: {
    label: 'Ward office',
    color: '#7048E8',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>,
  },
  pharmacy_24x7: {
    label: 'Pharmacy',
    color: '#2BA887',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>,
  },
}

function EssentialsCard({ facilities }: { facilities: Facility[] }) {
  if (facilities.length === 0) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #F5F5F5' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Nearest Essentials
        </span>
      </div>
      {facilities.map((f, idx) => {
        const meta = FACILITY_META[f.kind]
        return (
          <div
            key={f.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 20px',
              borderBottom: idx < facilities.length - 1 ? '1px solid #F5F5F5' : 'none',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: meta ? `${meta.color}18` : '#F5F5F5',
              color: meta?.color ?? '#888',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {meta?.icon ?? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f0f0f', fontFamily: 'var(--font-inter), Arial, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.name}
              </div>
              <div style={{ fontSize: 12, color: '#999', fontFamily: 'var(--font-inter), Arial, sans-serif', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.address_line}
                {f.is_24x7 && <span style={{ marginLeft: 8, color: '#2BA887', fontWeight: 500 }}>24×7</span>}
              </div>
            </div>

            {f.phone && (
              <a
                href={`tel:${f.phone}`}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#F5F5F5', color: '#555',
                  textDecoration: 'none',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#E8F5F0'; e.currentTarget.style.color = '#2BA887' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F5F5F5'; e.currentTarget.style.color = '#555' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                </svg>
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Weather + AQI ────────────────────────────────────────────────────────────

function weatherEmoji(condition: string) {
  const c = condition.toLowerCase()
  if (c.includes('thunder')) return '⛈️'
  if (c.includes('drizzle')) return '🌦️'
  if (c.includes('rain'))    return '🌧️'
  if (c.includes('snow'))    return '🌨️'
  if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return '🌫️'
  if (c.includes('cloud'))   return '☁️'
  if (c.includes('clear'))   return '☀️'
  return '🌤️'
}

function WeatherTile({ weather }: { weather: WeatherData | null | 'loading' | 'error' }) {
  return (
    <div style={{ flex: 1, background: '#fff', border: '1px solid #EBEBEB', borderRadius: 16, padding: 20, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Weather</div>
      {weather === 'loading' && <div style={{ fontSize: 13, color: '#ccc', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>Loading...</div>}
      {weather === 'error'   && <div style={{ fontSize: 13, color: '#bbb', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>Unavailable</div>}
      {weather && weather !== 'loading' && weather !== 'error' && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 36, lineHeight: 1 }}>{weatherEmoji(weather.condition)}</span>
            <span style={{ fontSize: 36, fontWeight: 700, color: '#0f0f0f', fontFamily: 'var(--font-inter), Arial, sans-serif', lineHeight: 1 }}>{weather.temp}°</span>
          </div>
          <div style={{ fontSize: 13, color: '#555', fontFamily: 'var(--font-inter), Arial, sans-serif', marginBottom: 4, textTransform: 'capitalize' }}>{weather.description}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#999', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>Feels {weather.feels_like}°</span>
            <span style={{ fontSize: 12, color: '#999', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>Humidity {weather.humidity}%</span>
          </div>
        </>
      )}
    </div>
  )
}

function AqiTile({ aqi }: { aqi: AqiData | null | 'loading' | 'error' }) {
  return (
    <div style={{ flex: 1, background: '#fff', border: '1px solid #EBEBEB', borderRadius: 16, padding: 20, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Air Quality</div>
      {aqi === 'loading' && <div style={{ fontSize: 13, color: '#ccc', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>Loading...</div>}
      {aqi === 'error'   && <div style={{ fontSize: 13, color: '#bbb', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>Unavailable</div>}
      {aqi && aqi !== 'loading' && aqi !== 'error' && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: aqi.color, fontFamily: 'var(--font-inter), Arial, sans-serif', lineHeight: 1 }}>{aqi.aqi}</span>
            <span style={{ fontSize: 13, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif', marginBottom: 4 }}>AQI</span>
          </div>
          <div style={{ fontSize: 13, color: '#555', fontFamily: 'var(--font-inter), Arial, sans-serif', marginBottom: 4 }}>{aqi.label}</div>
          {aqi.dominant_pollutant && (
            <div style={{ fontSize: 12, color: '#999', fontFamily: 'var(--font-inter), Arial, sans-serif', textTransform: 'uppercase' }}>
              Main: {aqi.dominant_pollutant}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Events ───────────────────────────────────────────────────────────────────

function formatEventDate(startsAt: string) {
  const date = new Date(startsAt)
  const day  = date.toLocaleDateString('en-IN', { day: 'numeric' })
  const mon  = date.toLocaleDateString('en-IN', { month: 'short' })
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  return { day, mon, time }
}

function EventsCard({ events }: { events: Event[] }) {
  if (events.length === 0) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #F5F5F5' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Upcoming Events
        </span>
      </div>
      {events.map((e, idx) => {
        const { day, mon, time } = formatEventDate(e.starts_at)
        const showCategory = e.category && e.category !== 'other'
        return (
          <div
            key={e.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 20px',
              borderBottom: idx < events.length - 1 ? '1px solid #F5F5F5' : 'none',
            }}
          >
            {/* Date column */}
            <div style={{ flexShrink: 0, width: 36, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f0f0f', fontFamily: 'var(--font-inter), Arial, sans-serif', lineHeight: 1.2 }}>{day}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#2BA887', fontFamily: 'var(--font-inter), Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{mon}</div>
              <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'var(--font-inter), Arial, sans-serif', marginTop: 2 }}>{time}</div>
            </div>

            {/* Title + venue */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f0f0f', fontFamily: 'var(--font-inter), Arial, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {e.title}
              </div>
              <div style={{ fontSize: 12, color: '#999', fontFamily: 'var(--font-inter), Arial, sans-serif', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {e.venue}
              </div>
            </div>

            {/* Category tag */}
            {showCategory && (
              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 400, padding: '4px 10px', borderRadius: 24, background: '#F5F5F5', color: '#777', fontFamily: 'var(--font-inter), Arial, sans-serif', textTransform: 'capitalize' }}>
                {e.category}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Around() {
  const [localities, setLocalities]                   = useState<Locality[]>([])
  const [persistedLocalityId, setPersistedLocalityId] = useState<string | null>(null)
  const [isMobile, setIsMobile]                       = useState(false)
  const [navExpanded, setNavExpanded]                 = useState(true)
  const [weather, setWeather]                         = useState<WeatherData | null | 'loading' | 'error'>('loading')
  const [aqi, setAqi]                                 = useState<AqiData | null | 'loading' | 'error'>('loading')
  const [alerts, setAlerts]                           = useState<Alert[]>([])
  const [facilities, setFacilities]                   = useState<Facility[]>([])
  const [events, setEvents]                           = useState<Event[]>([])

  const selectedLocality = useMemo(() => {
    if (!persistedLocalityId) return null
    return localities.find(l => l.id === persistedLocalityId) ?? null
  }, [persistedLocalityId, localities])

  function handleLocalityChange(l: Locality | null) {
    if (l) {
      localStorage.setItem(LOCALITY_STORAGE_KEY, l.id)
      setPersistedLocalityId(l.id)
    } else {
      localStorage.removeItem(LOCALITY_STORAGE_KEY)
      setPersistedLocalityId(null)
    }
  }

  const coords = useMemo(() => {
    if (!selectedLocality) return null
    const lat = selectedLocality.lat ?? selectedLocality.admin_zones?.lat ?? null
    const lon = selectedLocality.lon ?? selectedLocality.admin_zones?.lon ?? null
    if (lat == null || lon == null) return null
    return { lat, lon }
  }, [selectedLocality])

  useEffect(() => {
    const stored = localStorage.getItem(LOCALITY_STORAGE_KEY)
    if (stored) setPersistedLocalityId(stored)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch(`/api/localities?city_id=${MUMBAI_CITY_ID}`)
      .then(r => r.json())
      .then(d => setLocalities(d.localities || []))
  }, [])

  // Fetch alerts when locality changes
  useEffect(() => {
    if (!selectedLocality) { setAlerts([]); return }
    fetch(`/api/around/alerts?locality_id=${selectedLocality.id}`)
      .then(r => r.json())
      .then(d => setAlerts(d.alerts || []))
      .catch(() => setAlerts([]))
  }, [selectedLocality?.id])

  // Fetch facilities when locality changes
  useEffect(() => {
    if (!selectedLocality) { setFacilities([]); return }
    const params = new URLSearchParams({ city_id: MUMBAI_CITY_ID })
    if (selectedLocality.admin_zone_id) params.set('admin_zone_id', selectedLocality.admin_zone_id)
    fetch(`/api/around/facilities?${params}`)
      .then(r => r.json())
      .then(d => setFacilities(d.facilities || []))
      .catch(() => setFacilities([]))
  }, [selectedLocality?.id])

  // Fetch events when locality changes
  useEffect(() => {
    if (!selectedLocality) { setEvents([]); return }
    fetch(`/api/around/events?locality_id=${selectedLocality.id}`)
      .then(r => r.json())
      .then(d => setEvents(d.events || []))
      .catch(() => setEvents([]))
  }, [selectedLocality?.id])

  // Fetch weather + AQI when coords resolve
  useEffect(() => {
    if (!coords) { setWeather(null); setAqi(null); return }
    setWeather('loading')
    setAqi('loading')
    fetch(`/api/weather?lat=${coords.lat}&lon=${coords.lon}`)
      .then(r => r.json())
      .then(d => setWeather(d.error ? 'error' : d))
      .catch(() => setWeather('error'))
    fetch(`/api/aqi?lat=${coords.lat}&lon=${coords.lon}`)
      .then(r => r.json())
      .then(d => setAqi(d.error ? 'error' : d))
      .catch(() => setAqi('error'))
  }, [coords?.lat, coords?.lon])

  const weekday = useMemo(
    () => new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(new Date()),
    []
  )

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
      <Header
  selectedLocality={selectedLocality}
  localities={localities}
  onLocalityChange={handleLocalityChange}
  onToggleNav={() => setNavExpanded(!navExpanded)}
  isMobile={isMobile}
  userProfile={null}
/>

      <div style={{ paddingTop: 57, display: 'flex', minHeight: 'calc(100vh - 57px)' }}>
        {!isMobile && <LeftNav expanded={navExpanded} />}

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '24px 24px 40px', minWidth: 0 }}>
          <main style={{ width: '100%', maxWidth: 640, minWidth: 0, flexShrink: 1 }}>
            {!selectedLocality ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>📍</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 8, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>Pick a locality</div>
                <div style={{ fontSize: 14, color: '#999', lineHeight: 1.6, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                  Select a locality from the header to see the dashboard for it.
                </div>
              </div>
            ) : (
              <div style={{ padding: '4px 4px 0' }}>

                {/* Locality header */}
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f0f0f', letterSpacing: '-0.01em', fontFamily: 'var(--font-inter), Arial, sans-serif', marginBottom: 4 }}>
                  Around
                </h1>
                <p style={{ fontSize: 14, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif', marginBottom: 12 }}>
                  {selectedLocality.name} dashboard · {weekday}
                </p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 24 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 24, background: '#F7FCF9', color: '#000', fontFamily: 'var(--font-inter), Arial, sans-serif', border: '1px solid #E0F0EA' }}>
                    {selectedLocality.name}
                  </span>
                  {selectedLocality.admin_zones?.display_name && (
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 24, background: '#2B78A8', color: '#fff', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                      {selectedLocality.admin_zones.display_name}
                    </span>
                  )}
                </div>

                {/* Active alerts — hidden when none */}
                <AlertBanner alerts={alerts} />

                {/* Weather + AQI tiles */}
                {coords && (
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <WeatherTile weather={weather} />
                    <AqiTile aqi={aqi} />
                  </div>
                )}

                {/* Nearest essentials — hidden when empty */}
                <EssentialsCard facilities={facilities} />

                {/* Upcoming events — hidden when empty */}
                <EventsCard events={events} />

              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}