'use client'

import { useEffect, useState, useMemo } from 'react'
import { type Locality } from '@/components/LocationSelector'
import { LeftNavWrapper as LeftNav } from '@/components/LeftNav'
import { Header } from '@/components/Header'

const MUMBAI_CITY_ID = '49a211bc-0e51-4ae1-97af-1b1a4f6f0a4b'
const LOCALITY_STORAGE_KEY = 'hypr.locality'

type Issue = {
  id: string
  category: string
  status: string
  title: string
  description: string
  upvote_count: number
  reported_at: string
  ward_code: string
  lat: number
  lon: number
}

type Official = {
  id: string
  role: string
  name: string
  title: string
  party: string | null
  phone: string | null
  sort_order: number
}

// ─── Issue helpers ─────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
  pothole:      { label: 'Pothole',      color: '#E07B00',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg> },
  garbage:      { label: 'Garbage',      color: '#5C7A3E',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> },
  water:        { label: 'Water',        color: '#2B78A8',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6 9 4 13 4 16a8 8 0 0016 0c0-3-2-7-8-14z"/></svg> },
  drainage:     { label: 'Drainage',     color: '#4A90D9',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg> },
  streetlight:  { label: 'Streetlight',  color: '#F5A623',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
  traffic:      { label: 'Traffic',      color: '#D94F4F',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="17" r="1.5" fill="currentColor"/></svg> },
  trees:        { label: 'Trees',        color: '#2BA887',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12M12 12l-4-4M12 12l4-4M8 8l-4-4M16 8l4-4M4 4h16"/></svg> },
  encroachment: { label: 'Encroachment', color: '#7048E8',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h6"/></svg> },
  other:        { label: 'Other',        color: '#999',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  open:         { label: 'Open',         bg: '#FFF5F5', color: '#D94F4F' },
  acknowledged: { label: 'Acknowledged', bg: '#FFFBF0', color: '#E07B00' },
  in_progress:  { label: 'In progress',  bg: '#F0F7FF', color: '#4A90D9' },
  resolved:     { label: 'Resolved',     bg: '#F0FBF6', color: '#2BA887' },
  stale:        { label: 'Stale',        bg: '#F5F5F5', color: '#999'    },
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function IssueCard({ issue }: { issue: Issue }) {
  const cat    = CATEGORY_META[issue.category] ?? CATEGORY_META.other
  const status = STATUS_STYLE[issue.status]    ?? STATUS_STYLE.open

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #EBEBEB', padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Category icon */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          background: `${cat.color}18`, color: cat.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {cat.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0f0f0f', fontFamily: 'var(--font-inter), Arial, sans-serif', lineHeight: 1.4, marginBottom: 6 }}>
            {issue.title}
          </div>

          {/* Tags row */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 24, background: cat.color + '18', color: cat.color, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
              {cat.label}
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 24, background: status.bg, color: status.color, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
              {status.label}
            </span>
          </div>

          {/* Description */}
          {issue.description && (
            <div style={{ fontSize: 13, color: '#666', fontFamily: 'var(--font-inter), Arial, sans-serif', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {issue.description}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '4px 0', fontSize: 12, fontFamily: 'var(--font-inter), Arial, sans-serif', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#2BA887'}
              onMouseLeave={e => e.currentTarget.style.color = '#aaa'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              {issue.upvote_count}
            </button>
            <span style={{ fontSize: 12, color: '#bbb', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
              {timeAgo(issue.reported_at)}
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 24, background: '#2B78A8', color: '#fff', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
              Ward {issue.ward_code}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Officials panel ───────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  corporator:        'Corporator',
  mla:               'MLA',
  mp:                'MP',
  ward_officer:      'Ward Officer',
  asst_engineer:     'Asst. Engineer',
  police_inspector:  'Police Inspector',
  fire_officer:      'Fire Officer',
  health_officer:    'Health Officer',
}

function OfficialsPanel({ officials }: { officials: Official[] }) {
  return (
    <div style={{ background: '#F6F7F8', borderRadius: 16, border: '1px solid #EBEBEB', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #EBEBEB' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Your Representatives
        </span>
      </div>

      {officials.length === 0 ? (
        <div style={{ padding: '20px', fontSize: 13, color: '#bbb', fontFamily: 'var(--font-inter), Arial, sans-serif', textAlign: 'center' }}>
          No officials found for this ward
        </div>
      ) : (
        officials.map((o, idx) => (
          <div key={o.id} style={{
            padding: '14px 20px',
            borderBottom: idx < officials.length - 1 ? '1px solid #EBEBEB' : 'none',
            background: '#F6F7F8',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#2BA887', fontFamily: 'var(--font-inter), Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
                  {ROLE_LABEL[o.role] ?? o.role}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f0f0f', fontFamily: 'var(--font-inter), Arial, sans-serif', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.name.replace(' [placeholder]', '')}
                </div>
                <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.title.replace(' [placeholder]', '')}
                </div>
                {o.party && (
                  <div style={{ fontSize: 11, color: '#bbb', fontFamily: 'var(--font-inter), Arial, sans-serif', marginTop: 2 }}>
                    {o.party}
                  </div>
                )}
              </div>
              {o.phone && (
                <a
                  href={`tel:${o.phone}`}
                  style={{
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#EBEBEB', color: '#555',
                    textDecoration: 'none',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E8F5F0'; e.currentTarget.style.color = '#2BA887' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#EBEBEB'; e.currentTarget.style.color = '#555' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Civic() {
  const [localities, setLocalities]                   = useState<Locality[]>([])
  const [persistedLocalityId, setPersistedLocalityId] = useState<string | null>(null)
  const [userProfile, setUserProfile]                 = useState<{ first_name: string; last_name: string } | null>(null)
  const [homeLocalityId, setHomeLocalityId]           = useState<string | null>(null)
  const [isMobile, setIsMobile]                       = useState(false)
  const [navExpanded, setNavExpanded]                 = useState(true)
  const [issues, setIssues]                           = useState<Issue[]>([])
  const [officials, setOfficials]                     = useState<Official[]>([])
  const [loading, setLoading]                         = useState(false)

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

  useEffect(() => {
    async function fetchProfile() {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('first_name, last_name, locality_id')
          .eq('id', user.id)
          .single()
        if (profile) {
          setUserProfile({ first_name: profile.first_name, last_name: profile.last_name })
          if (profile.locality_id) setHomeLocalityId(profile.locality_id)
        }
      }
    }
    fetchProfile()
  }, [])

  // Fetch issues + officials when locality changes
  useEffect(() => {
    if (!selectedLocality) { setIssues([]); setOfficials([]); return }

    const wardCode    = selectedLocality.admin_zones?.zone_code
    const adminZoneId = selectedLocality.admin_zone_id

    setLoading(true)

    const fetches: Promise<void>[] = []

    if (wardCode) {
      fetches.push(
        fetch(`/api/civic/issues?ward_code=${encodeURIComponent(wardCode)}`)
          .then(r => r.json())
          .then(d => setIssues(d.issues || []))
          .catch(() => setIssues([]))
      )
    } else {
      setIssues([])
    }

    if (adminZoneId) {
      fetches.push(
        fetch(`/api/civic/officials?admin_zone_id=${adminZoneId}`)
          .then(r => r.json())
          .then(d => setOfficials(d.officials || []))
          .catch(() => setOfficials([]))
      )
    } else {
      setOfficials([])
    }

    Promise.all(fetches).finally(() => setLoading(false))
  }, [selectedLocality?.id])

  const wardCode = selectedLocality?.admin_zones?.zone_code

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
      <Header
        selectedLocality={selectedLocality}
        localities={localities}
        onLocalityChange={handleLocalityChange}
        onToggleNav={() => setNavExpanded(!navExpanded)}
        isMobile={isMobile}
        userProfile={userProfile}
        homeLocalityId={homeLocalityId}
        workLocalityId={null}
      />

      <div style={{ paddingTop: 57, display: 'flex', minHeight: 'calc(100vh - 57px)' }}>
        {!isMobile && <LeftNav expanded={navExpanded} />}

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '24px 24px 40px', gap: 24, minWidth: 0 }}>

          {/* Main column — issues feed */}
          <main style={{ width: '100%', maxWidth: 640, minWidth: 0, flexShrink: 1 }}>

            {/* Page header */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f0f0f', letterSpacing: '-0.01em', fontFamily: 'var(--font-inter), Arial, sans-serif', marginBottom: 4 }}>
                Civic
              </h1>
              <p style={{ fontSize: 14, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif', marginBottom: selectedLocality ? 12 : 0 }}>
                {selectedLocality ? `Issues reported in ${selectedLocality.name}` : 'Select a locality to see reported issues'}
              </p>
              {selectedLocality && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 24, background: '#F7FCF9', color: '#000', fontFamily: 'var(--font-inter), Arial, sans-serif', border: '1px solid #E0F0EA' }}>
                    {selectedLocality.name}
                  </span>
                  {selectedLocality.admin_zones?.display_name && (
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 24, background: '#2B78A8', color: '#fff', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                      {selectedLocality.admin_zones.display_name}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Issues */}
            {!selectedLocality ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>📍</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 8, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>Pick a locality</div>
                <div style={{ fontSize: 14, color: '#999', lineHeight: 1.6, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                  Select a locality from the header to see civic issues reported there.
                </div>
              </div>
            ) : loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#aaa', fontSize: 14, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                Loading issues...
              </div>
            ) : !wardCode ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#999', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                  No ward information available for this locality.
                </div>
              </div>
            ) : issues.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 8, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>All clear</div>
                <div style={{ fontSize: 14, color: '#999', lineHeight: 1.6, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                  No issues reported in {selectedLocality.name} yet.
                </div>
              </div>
            ) : (
              <div style={{ background: '#fff' }}>
                {issues.map(issue => <IssueCard key={issue.id} issue={issue} />)}
              </div>
            )}
          </main>

          {/* Right panel — officials */}
          {!isMobile && selectedLocality && (
            <aside style={{ width: 312, flexShrink: 0 }}>
              <div style={{ position: 'sticky', top: 81 }}>
                <OfficialsPanel officials={officials} />
              </div>
            </aside>
          )}

        </div>
      </div>
    </div>
  )
}
