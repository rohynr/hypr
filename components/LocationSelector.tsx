'use client'

import { useEffect, useState, useRef } from 'react'

type AdminZone = {
  display_name: string
  zone_code: string
  lat: number | null
  lon: number | null
}

export type Locality = {
  id: string
  name: string
  level: string
  parent_id: string | null
  admin_zone_id: string | null
  lat: number | null
  lon: number | null
  admin_zones: AdminZone | null
}

function getWardLabel(locality: Locality | null): string {
  if (!locality) return ''
  if (locality.admin_zones?.display_name) return locality.admin_zones.display_name
  return ''
}

function MapCircle() {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      border: '1.5px solid #D0EBE3',
      background: '#F0FAF6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden', position: 'relative',
    }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="12" x2="36" y2="12" stroke="#C8E6DC" strokeWidth="0.8"/>
        <line x1="0" y1="20" x2="36" y2="20" stroke="#C8E6DC" strokeWidth="0.8"/>
        <line x1="0" y1="28" x2="36" y2="28" stroke="#C8E6DC" strokeWidth="0.8"/>
        <line x1="10" y1="0" x2="10" y2="36" stroke="#C8E6DC" strokeWidth="0.8"/>
        <line x1="20" y1="0" x2="20" y2="36" stroke="#C8E6DC" strokeWidth="0.8"/>
        <line x1="30" y1="0" x2="30" y2="36" stroke="#C8E6DC" strokeWidth="0.8"/>
        <circle cx="18" cy="18" r="4" fill="#2BA887"/>
        <circle cx="18" cy="18" r="7" fill="#2BA887" fillOpacity="0.15"/>
      </svg>
    </div>
  )
}

const FONT = 'var(--font-inter), Arial, sans-serif'

export function LocationSelector({ selectedLocality, localities, onSelect, homeLocalityId, workLocalityId }: {
  selectedLocality: Locality | null
  localities: Locality[]
  onSelect: (l: Locality | null) => void
  homeLocalityId: string | null
  workLocalityId: string | null
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isHome = !!homeLocalityId && selectedLocality?.id === homeLocalityId
  const wardLabel = getWardLabel(selectedLocality)
  const primaryLabel = isHome ? 'Home' : (selectedLocality?.name || 'All of Mumbai')

  const homeLocality = homeLocalityId ? localities.find(l => l.id === homeLocalityId) ?? null : null
  const workLocality = workLocalityId ? localities.find(l => l.id === workLocalityId) ?? null : null
  const hasSaved = !!(homeLocality || workLocality)

  const exploreLocalities = localities
    .filter(l => l.level === 'locality')
    .filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  function rowBg(id: string) { return selectedLocality?.id === id ? '#F7FCF9' : '#fff' }
  function rowHover(e: React.MouseEvent<HTMLDivElement>, id: string, on: boolean) {
    if (selectedLocality?.id !== id) e.currentTarget.style.background = on ? '#fafafa' : '#fff'
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: open ? '#F0FAF6' : '#F7F8F9',
          border: '1px solid #E2E8E6',
          cursor: 'pointer', padding: '4px 12px 4px 5px', borderRadius: 8,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#EEF6F3' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = '#F7F8F9' }}
      >
        <MapCircle />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f0f0f', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 4 }}>
            {primaryLabel}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          {isHome ? (
            <div style={{ fontSize: 11, color: '#888', fontFamily: FONT, marginTop: -2 }}>
              {selectedLocality!.name}{wardLabel ? ` · ${wardLabel}` : ''}
            </div>
          ) : selectedLocality && wardLabel ? (
            <div style={{ fontSize: 11, color: '#888', fontFamily: FONT, marginTop: -2 }}>{wardLabel}</div>
          ) : null}
        </div>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 300, background: '#fff', border: '1px solid #E8E8E8', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', zIndex: 1000, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
            <input
              autoFocus
              placeholder="Search localities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E8E8', fontSize: 13, fontFamily: FONT, outline: 'none', background: '#fafafa', color: '#111', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {/* All Mumbai */}
            <div
              onClick={() => { onSelect(null); setOpen(false); setSearch('') }}
              style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: !selectedLocality ? '#F7FCF9' : '#fff', borderBottom: '1px solid #f0f0f0', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (selectedLocality) e.currentTarget.style.background = '#fafafa' }}
              onMouseLeave={e => { if (selectedLocality) e.currentTarget.style.background = '#fff' }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2BA887', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111', fontFamily: FONT }}>All Mumbai</div>
                <div style={{ fontSize: 11, color: '#888', fontFamily: FONT }}>Show all stories</div>
              </div>
            </div>

            {/* Saved Locations */}
            {hasSaved && (
              <>
                <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 600, color: '#aaa', fontFamily: FONT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Saved Locations</div>
                {homeLocality && (
                  <div
                    onClick={() => { onSelect(homeLocality); setOpen(false); setSearch('') }}
                    style={{ padding: '9px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: rowBg(homeLocality.id), transition: 'background 0.1s' }}
                    onMouseEnter={e => rowHover(e, homeLocality.id, true)}
                    onMouseLeave={e => rowHover(e, homeLocality.id, false)}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>🏠</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111', fontFamily: FONT }}>Home</div>
                      <div style={{ fontSize: 11, color: '#888', fontFamily: FONT }}>
                        {homeLocality.name}{getWardLabel(homeLocality) ? ` · ${getWardLabel(homeLocality)}` : ''}
                      </div>
                    </div>
                  </div>
                )}
                {workLocality && (
                  <div
                    onClick={() => { onSelect(workLocality); setOpen(false); setSearch('') }}
                    style={{ padding: '9px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: rowBg(workLocality.id), transition: 'background 0.1s' }}
                    onMouseEnter={e => rowHover(e, workLocality.id, true)}
                    onMouseLeave={e => rowHover(e, workLocality.id, false)}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>💼</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111', fontFamily: FONT }}>Work</div>
                      <div style={{ fontSize: 11, color: '#888', fontFamily: FONT }}>
                        {workLocality.name}{getWardLabel(workLocality) ? ` · ${getWardLabel(workLocality)}` : ''}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ borderTop: '1px solid #f0f0f0', margin: '6px 0 0' }} />
              </>
            )}

            {/* Explore */}
            <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 600, color: '#aaa', fontFamily: FONT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Explore</div>
            {exploreLocalities.map(locality => (
              <div
                key={locality.id}
                onClick={() => { onSelect(locality); setOpen(false); setSearch('') }}
                style={{ padding: '9px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: rowBg(locality.id), transition: 'background 0.1s' }}
                onMouseEnter={e => rowHover(e, locality.id, true)}
                onMouseLeave={e => rowHover(e, locality.id, false)}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111', fontFamily: FONT }}>{locality.name}</div>
                  <div style={{ fontSize: 11, color: '#888', fontFamily: FONT }}>{locality.admin_zones?.display_name || 'Locality'}</div>
                </div>
                {locality.id === homeLocalityId && (
                  <span style={{ fontSize: 14, lineHeight: 1 }}>🏠</span>
                )}
              </div>
            ))}
            {exploreLocalities.length === 0 && search && (
              <div style={{ padding: 16, textAlign: 'center', color: '#aaa', fontSize: 13, fontFamily: FONT }}>No results for &ldquo;{search}&rdquo;</div>
            )}
            <div style={{ height: 8 }} />
          </div>
        </div>
      )}
    </div>
  )
}
