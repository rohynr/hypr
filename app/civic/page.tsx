'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { type Locality } from '@/components/LocationSelector'
import { LeftNavWrapper as LeftNav } from '@/components/LeftNav'
import { Header } from '@/components/Header'

const MUMBAI_CITY_ID = '49a211bc-0e51-4ae1-97af-1b1a4f6f0a4b'
const MUMBAI_CENTER: [number, number] = [19.0760, 72.8777]
const LOCALITY_STORAGE_KEY = 'hypr.locality'
const FONT = 'var(--font-inter), Arial, sans-serif'

// ─── Types ────────────────────────────────────────────────────────────────────

type Issue = {
  id: string
  category: string
  status: string
  description: string
  upvotes: number
  created_at: string
  ward_code: string
  latitude: number | null
  longitude: number | null
  image_url: string | null
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

// ─── Lookup tables ─────────────────────────────────────────────────────────────

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

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function injectLeafletCss() {
  if (typeof document === 'undefined' || document.getElementById('leaflet-css')) return
  const link = document.createElement('link')
  link.id = 'leaflet-css'
  link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)
}

// ─── MapView (issues on a map) ─────────────────────────────────────────────────

function MapView({ issues, center }: { issues: Issue[]; center: [number, number] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const LRef         = useRef<any>(null)
  const layerRef     = useRef<any>(null)
  const issuesRef    = useRef(issues)
  issuesRef.current  = issues

  function renderMarkers() {
    const L     = LRef.current
    const layer = layerRef.current
    if (!L || !layer) return
    layer.clearLayers()
    for (const issue of issuesRef.current) {
      if (issue.latitude == null || issue.longitude == null) continue
      const cat    = CATEGORY_META[issue.category] ?? CATEGORY_META.other
      const status = STATUS_STYLE[issue.status]    ?? STATUS_STYLE.open
      const icon   = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${cat.color};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -10],
      })
      const popup = L.popup({ maxWidth: 220 }).setContent(
        `<div style="font-family:Inter,sans-serif;padding:2px">
          <div style="font-size:11px;font-weight:600;color:${cat.color};text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px">${cat.label}</div>
          <div style="font-size:13px;color:#333;line-height:1.4;margin-bottom:6px">${issue.description.length > 100 ? issue.description.slice(0, 100) + '…' : issue.description}</div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;font-weight:500;padding:2px 7px;border-radius:12px;background:${status.bg};color:${status.color}">${status.label}</span>
            <span style="font-size:11px;color:#888">▲ ${issue.upvotes ?? 0} · ${timeAgo(issue.created_at)}</span>
          </div>
        </div>`
      )
      L.marker([issue.latitude, issue.longitude], { icon }).bindPopup(popup).addTo(layer)
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    async function init() {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current) return
      LRef.current = L
      injectLeafletCss()
      const map = L.map(containerRef.current, { center, zoom: 14, scrollWheelZoom: false })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)
      mapRef.current  = map
      layerRef.current = L.layerGroup().addTo(map)
      renderMarkers()
    }

    init()
    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      LRef.current = layerRef.current = null
    }
  }, [])

  useEffect(() => { renderMarkers() }, [issues])

  return <div ref={containerRef} style={{ height: '100%', minHeight: 500, width: '100%' }} />
}

// ─── LocationPicker (draggable marker for modal) ───────────────────────────────

function LocationPicker({ onLocationChange, initialCenter, height = 280 }: {
  onLocationChange: (lat: number, lng: number) => void
  initialCenter: [number, number]
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false
    let map: any

    async function init() {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current) return
      injectLeafletCss()

      map = L.map(containerRef.current, { center: initialCenter, zoom: 16 })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      const pinIcon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:#2BA887;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);transform:rotate(-45deg)"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 20], popupAnchor: [0, -22],
      })

      const marker = L.marker(initialCenter, { draggable: true, icon: pinIcon }).addTo(map)
      onLocationChange(initialCenter[0], initialCenter[1])

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng()
        onLocationChange(lat, lng)
      })
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng)
        onLocationChange(e.latlng.lat, e.latlng.lng)
      })

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled) return
            const gps: [number, number] = [pos.coords.latitude, pos.coords.longitude]
            map.setView(gps, 17)
            marker.setLatLng(gps)
            onLocationChange(gps[0], gps[1])
          },
          () => {}
        )
      }
    }

    init()
    return () => { cancelled = true; map?.remove() }
  }, [])

  return <div ref={containerRef} style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden' }} />
}

// ─── IssueCard ─────────────────────────────────────────────────────────────────

function IssueCard({ issue, isUpvoted, onUpvote }: {
  issue: Issue
  isUpvoted: boolean
  onUpvote: (id: string) => void
}) {
  const cat    = CATEGORY_META[issue.category] ?? CATEGORY_META.other
  const status = STATUS_STYLE[issue.status]    ?? STATUS_STYLE.open

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #EBEBEB', padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, marginTop: 2, background: `${cat.color}18`, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {cat.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 24, background: cat.color + '18', color: cat.color, fontFamily: FONT }}>
              {cat.label}
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 24, background: status.bg, color: status.color, fontFamily: FONT }}>
              {status.label}
            </span>
          </div>

          <div style={{ fontSize: 14, color: '#333', fontFamily: FONT, lineHeight: 1.55, marginBottom: issue.image_url ? 10 : 8 }}>
            {issue.description}
          </div>

          {issue.image_url && (
            <div style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', maxHeight: 180 }}>
              <img src={issue.image_url} alt="" style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => onUpvote(issue.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: isUpvoted ? '#2BA887' : '#aaa', padding: '4px 0', fontSize: 12, fontFamily: FONT, transition: 'color 0.15s' }}
              onMouseEnter={e => { if (!isUpvoted) e.currentTarget.style.color = '#2BA887' }}
              onMouseLeave={e => { if (!isUpvoted) e.currentTarget.style.color = '#aaa' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={isUpvoted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              {issue.upvotes}
            </button>
            <span style={{ fontSize: 12, color: '#bbb', fontFamily: FONT }}>{timeAgo(issue.created_at)}</span>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 24, background: '#2B78A8', color: '#fff', fontFamily: FONT }}>
              Ward {issue.ward_code}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── OfficialsPanel ────────────────────────────────────────────────────────────

function OfficialsPanel({ officials }: { officials: Official[] }) {
  return (
    <div style={{ background: '#F6F7F8', borderRadius: 16, border: '1px solid #EBEBEB', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #EBEBEB' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#888', fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Your Representatives
        </span>
      </div>
      {officials.length === 0 ? (
        <div style={{ padding: 20, fontSize: 13, color: '#bbb', fontFamily: FONT, textAlign: 'center' }}>
          No officials found for this ward
        </div>
      ) : (
        officials.map((o, idx) => (
          <div key={o.id} style={{ padding: '14px 20px', borderBottom: idx < officials.length - 1 ? '1px solid #EBEBEB' : 'none', background: '#F6F7F8' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#2BA887', fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
                  {ROLE_LABEL[o.role] ?? o.role}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f0f0f', fontFamily: FONT, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.name.replace(' [placeholder]', '')}
                </div>
                <div style={{ fontSize: 11, color: '#888', fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.title.replace(' [placeholder]', '')}
                </div>
                {o.party && <div style={{ fontSize: 11, color: '#bbb', fontFamily: FONT, marginTop: 2 }}>{o.party}</div>}
              </div>
              {o.phone && (
                <a href={`tel:${o.phone}`} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: '#EBEBEB', color: '#555', textDecoration: 'none', transition: 'background 0.15s, color 0.15s' }}
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

// ─── ReportModal ───────────────────────────────────────────────────────────────

function ReportModal({ wardCode, userId, initialCenter, onClose, onSuccess }: {
  wardCode: string
  userId: string
  initialCenter: [number, number]
  onClose: () => void
  onSuccess: () => void
}) {
  const [category,      setCategory]      = useState<string | null>(null)
  const [description,   setDescription]   = useState('')
  const [markerLat,     setMarkerLat]     = useState(initialCenter[0])
  const [markerLng,     setMarkerLng]     = useState(initialCenter[1])
  const [imageFile,     setImageFile]     = useState<File | null>(null)
  const [imagePreview,  setImagePreview]  = useState<string | null>(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [duplicates,    setDuplicates]    = useState<Issue[]>([])
  const [showDups,      setShowDups]      = useState(false)
  const [dupUpvoted,    setDupUpvoted]    = useState<Set<string>>(new Set())
  const [error,         setError]         = useState<string | null>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(skipDupCheck = false) {
    if (!category || !description.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()

      if (!skipDupCheck) {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const { data: dups } = await supabase
          .from('civic_issues')
          .select('id, category, status, description, upvotes, created_at, ward_code, latitude, longitude, image_url')
          .eq('ward_code', wardCode)
          .eq('category', category)
          .eq('status', 'open')
          .gte('created_at', since)
        if (dups && dups.length > 0) {
          setDuplicates(dups as Issue[])
          setShowDups(true)
          setSubmitting(false)
          return
        }
      }

      let imageUrl: string | null = null
      if (imageFile) {
        const ext  = imageFile.name.split('.').pop() || 'jpg'
        const path = `${Date.now()}.${ext}`
        const { data: up, error: upErr } = await supabase.storage.from('civic-issues').upload(path, imageFile)
        if (!upErr && up) {
          imageUrl = supabase.storage.from('civic-issues').getPublicUrl(up.path).data.publicUrl
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/civic/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          ward_code: wardCode, user_id: userId, category,
          description: description.trim(),
          latitude: markerLat, longitude: markerLng, image_url: imageUrl, status: 'open',
        }),
      })
      if (!res.ok) { setError((await res.json()).error || 'Submission failed'); return }
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDupUpvote(issueId: string) {
    if (dupUpvoted.has(issueId)) return
    setDupUpvoted(prev => new Set([...prev, issueId]))
    setDuplicates(prev => prev.map(i => i.id === issueId ? { ...i, upvotes: i.upvotes + 1 } : i))
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/civic/issues?id=${issueId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    })
  }

  const canSubmit = !!category && !!description.trim() && !submitting

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '20px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 520, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.22)', marginTop: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #EBEBEB' }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#0f0f0f', fontFamily: FONT }}>Report a Civic Issue</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 22, lineHeight: 1, padding: '2px 6px', borderRadius: 6 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px 28px' }}>

          {/* Category */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#555', fontFamily: FONT, marginBottom: 10 }}>Category</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {Object.entries(CATEGORY_META).filter(([k]) => k !== 'other').map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, fontFamily: FONT, cursor: 'pointer', border: `1.5px solid ${category === key ? meta.color : '#E0E0E0'}`, background: category === key ? meta.color + '18' : '#fff', color: category === key ? meta.color : '#666', transition: 'all 0.12s' }}
                >
                  {meta.icon}{meta.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#555', fontFamily: FONT, marginBottom: 8 }}>Description</div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 500))}
              placeholder="Describe the issue in detail…"
              rows={4}
              style={{ width: '100%', border: '1px solid #E0E0E0', borderRadius: 8, padding: 12, fontSize: 14, fontFamily: FONT, color: '#111', resize: 'vertical', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#2BA887' }}
              onBlur={e  => { e.currentTarget.style.borderColor = '#E0E0E0' }}
            />
            <div style={{ fontSize: 11, color: '#aaa', textAlign: 'right', marginTop: 4, fontFamily: FONT }}>{500 - description.length} left</div>
          </div>

          {/* Location */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#555', fontFamily: FONT, marginBottom: 8 }}>Location <span style={{ fontWeight: 400, color: '#aaa' }}>— drag pin to the exact spot</span></div>
            <LocationPicker onLocationChange={(lat, lng) => { setMarkerLat(lat); setMarkerLng(lng) }} initialCenter={initialCenter} height={280} />
            <div style={{ fontSize: 11, color: '#888', marginTop: 6, fontFamily: FONT }}>📍 {markerLat.toFixed(5)}, {markerLng.toFixed(5)}</div>
          </div>

          {/* Image */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#555', fontFamily: FONT, marginBottom: 8 }}>Photo <span style={{ fontWeight: 400, color: '#aaa' }}>(optional)</span></div>
            {imagePreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={imagePreview} alt="" style={{ height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid #EBEBEB' }} />
                <button onClick={() => { setImageFile(null); setImagePreview(null) }} style={{ position: 'absolute', top: -7, right: -7, width: 22, height: 22, borderRadius: '50%', background: '#fff', border: '1px solid #DDD', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#666' }}>×</button>
              </div>
            ) : (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: '1.5px dashed #D0D0D0', cursor: 'pointer', fontSize: 13, color: '#888', fontFamily: FONT }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload photo
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* Duplicates */}
          {showDups && duplicates.length > 0 && (
            <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: '#FFFBF0', border: '1px solid #F0DFA0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#B07800', marginBottom: 12, fontFamily: FONT }}>Similar issues already reported</div>
              {duplicates.slice(0, 3).map((dup, i) => {
                const dc = CATEGORY_META[dup.category] ?? CATEGORY_META.other
                return (
                  <div key={dup.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingBottom: i < duplicates.slice(0, 3).length - 1 ? 12 : 0, marginBottom: i < duplicates.slice(0, 3).length - 1 ? 12 : 0, borderBottom: i < duplicates.slice(0, 3).length - 1 ? '1px solid #ECDFA0' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: dc.color, textTransform: 'uppercase', marginBottom: 2, fontFamily: FONT }}>{dc.label}</div>
                      <div style={{ fontSize: 13, color: '#333', lineHeight: 1.4, fontFamily: FONT }}>{dup.description.length > 80 ? dup.description.slice(0, 80) + '…' : dup.description}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 3, fontFamily: FONT }}>{timeAgo(dup.created_at)} · ▲ {dup.upvotes}</div>
                    </div>
                    <button
                      onClick={() => handleDupUpvote(dup.id)}
                      disabled={dupUpvoted.has(dup.id)}
                      style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 16, border: 'none', background: dupUpvoted.has(dup.id) ? '#2BA887' : '#F0F0F0', color: dupUpvoted.has(dup.id) ? '#fff' : '#555', fontSize: 12, fontFamily: FONT, cursor: dupUpvoted.has(dup.id) ? 'default' : 'pointer', transition: 'all 0.15s' }}
                    >
                      ▲ Upvote
                    </button>
                  </div>
                )
              })}
              <button onClick={() => handleSubmit(true)} style={{ marginTop: 10, fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, textDecoration: 'underline', padding: 0 }}>
                Submit anyway as a new issue
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#FFF5F5', color: '#D94F4F', fontSize: 13, fontFamily: FONT }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={() => handleSubmit(false)}
            disabled={!canSubmit}
            style={{ width: '100%', background: canSubmit ? '#2BA887' : '#B2DDD0', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 600, fontFamily: FONT, cursor: canSubmit ? 'pointer' : 'default', transition: 'background 0.15s' }}
            onMouseEnter={e => { if (canSubmit) e.currentTarget.style.background = '#239973' }}
            onMouseLeave={e => { if (canSubmit) e.currentTarget.style.background = '#2BA887' }}
          >
            {submitting ? 'Submitting…' : 'Submit Issue'}
          </button>

        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Civic() {
  const [localities,           setLocalities]           = useState<Locality[]>([])
  const [persistedLocalityId,  setPersistedLocalityId]  = useState<string | null>(null)
  const [userProfile,          setUserProfile]          = useState<{ first_name: string; last_name: string } | null>(null)
  const [homeLocalityId,       setHomeLocalityId]       = useState<string | null>(null)
  const [currentUserId,        setCurrentUserId]        = useState<string | null>(null)
  const [isMobile,             setIsMobile]             = useState(false)
  const [navExpanded,          setNavExpanded]          = useState(true)
  const [issues,               setIssues]               = useState<Issue[]>([])
  const [officials,            setOfficials]            = useState<Official[]>([])
  const [loading,              setLoading]              = useState(false)
  const [view,                 setView]                 = useState<'list' | 'map'>('list')
  const [showModal,            setShowModal]            = useState(false)
  const [upvotedIds,           setUpvotedIds]           = useState<Set<string>>(new Set())

  const selectedLocality = useMemo(() => {
    if (!persistedLocalityId) return null
    return localities.find(l => l.id === persistedLocalityId) ?? null
  }, [persistedLocalityId, localities])

  useEffect(() => {
    document.title = selectedLocality
      ? `Civic — ${selectedLocality.name} / Hypr`
      : 'Civic / Hypr'
  }, [selectedLocality])

  const mapCenter = useMemo<[number, number]>(() => {
    const pts = issues.filter(i => i.latitude != null && i.longitude != null)
    if (pts.length > 0) {
      const lat = pts.reduce((s, i) => s + i.latitude!, 0) / pts.length
      const lng = pts.reduce((s, i) => s + i.longitude!, 0) / pts.length
      return [lat, lng]
    }
    return MUMBAI_CENTER
  }, [issues])

  function handleLocalityChange(l: Locality | null) {
    if (l) {
      localStorage.setItem(LOCALITY_STORAGE_KEY, l.id)
      setPersistedLocalityId(l.id)
    } else {
      localStorage.removeItem(LOCALITY_STORAGE_KEY)
      setPersistedLocalityId(null)
    }
  }

  async function handleUpvote(issueId: string) {
    if (!currentUserId || upvotedIds.has(issueId)) return
    setUpvotedIds(prev => new Set([...prev, issueId]))
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, upvotes: i.upvotes + 1 } : i))
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/civic/issues?id=${issueId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    })
    if (!res.ok) {
      setUpvotedIds(prev => { const n = new Set(prev); n.delete(issueId); return n })
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, upvotes: i.upvotes - 1 } : i))
    }
  }

  async function fetchIssues(wardCode: string, adminZoneId: string | null) {
    setLoading(true)
    const fetches: Promise<void>[] = [
      fetch(`/api/civic/issues?ward_code=${encodeURIComponent(wardCode)}`)
        .then(r => r.json()).then(d => setIssues(d.issues || [])).catch(() => setIssues([])),
    ]
    if (adminZoneId) {
      fetches.push(
        fetch(`/api/civic/officials?admin_zone_id=${adminZoneId}`)
          .then(r => r.json()).then(d => setOfficials(d.officials || [])).catch(() => setOfficials([]))
      )
    } else {
      setOfficials([])
    }
    await Promise.all(fetches)
    setLoading(false)
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
      .then(r => r.json()).then(d => setLocalities(d.localities || []))
  }, [])

  useEffect(() => {
    async function fetchProfile() {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const { data: profile } = await supabase
          .from('users').select('first_name, last_name, locality_id').eq('id', user.id).single()
        if (profile) {
          setUserProfile({ first_name: profile.first_name, last_name: profile.last_name })
          if (profile.locality_id) setHomeLocalityId(profile.locality_id)
        }
      }
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    if (!selectedLocality) { setIssues([]); setOfficials([]); return }
    const wardCode    = selectedLocality.admin_zones?.zone_code
    const adminZoneId = selectedLocality.admin_zone_id
    if (!wardCode) { setIssues([]); setLoading(false); return }
    fetchIssues(wardCode, adminZoneId ?? null)
  }, [selectedLocality?.id])

  const wardCode    = selectedLocality?.admin_zones?.zone_code
  const adminZoneId = selectedLocality?.admin_zone_id ?? null

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT }}>
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

          <main style={{ width: '100%', maxWidth: 640, minWidth: 0, flexShrink: 1 }}>

            {/* Page header */}
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f0f0f', letterSpacing: '-0.01em', fontFamily: FONT, marginBottom: 4 }}>
                Civic
              </h1>
              <p style={{ fontSize: 14, color: '#888', fontFamily: FONT, marginBottom: selectedLocality ? 12 : 0 }}>
                {selectedLocality ? `Issues reported in ${selectedLocality.name}` : 'Select a locality to see reported issues'}
              </p>
              {selectedLocality && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 24, background: '#F7FCF9', color: '#000', fontFamily: FONT, border: '1px solid #E0F0EA' }}>
                    {selectedLocality.name}
                  </span>
                  {selectedLocality.admin_zones?.display_name && (
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 24, background: '#2B78A8', color: '#fff', fontFamily: FONT }}>
                      {selectedLocality.admin_zones.display_name}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Controls: toggle + report button */}
            {selectedLocality && wardCode && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                {/* View toggle */}
                <div style={{ display: 'flex', background: '#F0F0F0', borderRadius: 20, padding: 3, gap: 2 }}>
                  {(['list', 'map'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      style={{ padding: '6px 18px', borderRadius: 18, border: 'none', fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: 'pointer', background: view === v ? '#2BA887' : 'transparent', color: view === v ? '#fff' : '#555', transition: 'all 0.15s' }}
                    >
                      {v === 'list' ? 'List' : 'Map'}
                    </button>
                  ))}
                </div>

                {/* Report button */}
                <button
                  onClick={() => setShowModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#2BA887', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#239973' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#2BA887' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Report an Issue
                </button>
              </div>
            )}

            {/* Content */}
            {!selectedLocality ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>📍</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 8, fontFamily: FONT }}>Pick a locality</div>
                <div style={{ fontSize: 14, color: '#999', lineHeight: 1.6, fontFamily: FONT }}>
                  Select a locality from the header to see civic issues reported there.
                </div>
              </div>
            ) : loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#aaa', fontSize: 14, fontFamily: FONT }}>
                Loading issues…
              </div>
            ) : !wardCode ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#999', fontFamily: FONT }}>No ward information available for this locality.</div>
              </div>
            ) : view === 'map' ? (
              <div style={{ height: 'calc(100vh - 280px)', minHeight: 500, borderRadius: 12, overflow: 'hidden', border: '1px solid #EBEBEB' }}>
                <MapView issues={issues} center={mapCenter} />
              </div>
            ) : issues.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 8, fontFamily: FONT }}>All clear</div>
                <div style={{ fontSize: 14, color: '#999', lineHeight: 1.6, fontFamily: FONT }}>
                  No issues reported in {selectedLocality.name} yet.
                </div>
              </div>
            ) : (
              <div>
                {issues.map(issue => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    isUpvoted={upvotedIds.has(issue.id)}
                    onUpvote={handleUpvote}
                  />
                ))}
              </div>
            )}
          </main>

          {/* Officials panel */}
          {!isMobile && selectedLocality && (
            <aside style={{ width: 312, flexShrink: 0 }}>
              <div style={{ position: 'sticky', top: 81 }}>
                <OfficialsPanel officials={officials} />
              </div>
            </aside>
          )}

        </div>
      </div>

      {/* Report modal */}
      {showModal && wardCode && currentUserId && (
        <ReportModal
          wardCode={wardCode}
          userId={currentUserId}
          initialCenter={mapCenter}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            if (wardCode) fetchIssues(wardCode, adminZoneId)
          }}
        />
      )}
    </div>
  )
}
