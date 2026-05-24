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

export function LocationSelector({ selectedLocality, localities, onSelect }: {
  selectedLocality: Locality | null
  localities: Locality[]
  onSelect: (l: Locality | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = localities.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
  const wardLabel = getWardLabel(selectedLocality)
  const displayName = selectedLocality?.name || 'All of Mumbai'

  const parents = filtered.filter(l => l.level === 'locality')
  const microMap: Record<string, Locality[]> = {}
  filtered.filter(l => l.level === 'microlocality').forEach(l => {
    if (!l.parent_id) return
    if (!microMap[l.parent_id]) microMap[l.parent_id] = []
    microMap[l.parent_id].push(l)
  })
  const orphanMicros = filtered.filter(l => l.level === 'microlocality' && l.parent_id && !parents.find(p => p.id === l.parent_id))

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
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f0f0f', fontFamily: 'var(--font-inter), Arial, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
            {displayName}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          {selectedLocality && (
            <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif', marginTop: -2 }}>{wardLabel}</div>
          )}
        </div>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 300, background: '#fff', border: '1px solid #E8E8E8', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', zIndex: 1000, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
            <input autoFocus placeholder="Search locality or area..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E8E8', fontSize: 13, fontFamily: 'var(--font-inter), Arial, sans-serif', outline: 'none', background: '#fafafa', color: '#111' }} />
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <div onClick={() => { onSelect(null); setOpen(false); setSearch('') }}
              style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: !selectedLocality ? '#F7FCF9' : '#fff', borderBottom: '1px solid #f0f0f0', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (selectedLocality) e.currentTarget.style.background = '#fafafa' }}
              onMouseLeave={e => { if (selectedLocality) e.currentTarget.style.background = '#fff' }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2BA887' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>All Mumbai</div>
                <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>Show all stories</div>
              </div>
            </div>

            {parents.map(parent => (
              <div key={parent.id}>
                <div onClick={() => { onSelect(parent); setOpen(false); setSearch('') }}
                  style={{ padding: '10px 16px', cursor: 'pointer', background: selectedLocality?.id === parent.id ? '#F7FCF9' : '#fff', borderTop: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (selectedLocality?.id !== parent.id) e.currentTarget.style.background = '#fafafa' }}
                  onMouseLeave={e => { if (selectedLocality?.id !== parent.id) e.currentTarget.style.background = '#fff' }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>{parent.name}</div>
                    <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                      {parent.admin_zones?.display_name || 'Locality'}
                    </div>
                  </div>
                  {microMap[parent.id]?.length > 0 && (
                    <div style={{ fontSize: 10, color: '#bbb', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>{microMap[parent.id].length} areas</div>
                  )}
                </div>
                {(microMap[parent.id] || []).map(micro => (
                  <div key={micro.id} onClick={() => { onSelect(micro); setOpen(false); setSearch('') }}
                    style={{ padding: '8px 16px 8px 36px', cursor: 'pointer', background: selectedLocality?.id === micro.id ? '#F7FCF9' : '#fafafa', borderTop: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (selectedLocality?.id !== micro.id) e.currentTarget.style.background = '#F0F0F0' }}
                    onMouseLeave={e => { if (selectedLocality?.id !== micro.id) e.currentTarget.style.background = '#fafafa' }}
                  >
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ccc', flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: '#444', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>{micro.name}</div>
                  </div>
                ))}
              </div>
            ))}

            {orphanMicros.map(micro => (
              <div key={micro.id} onClick={() => { onSelect(micro); setOpen(false); setSearch('') }}
                style={{ padding: '10px 16px', cursor: 'pointer', background: selectedLocality?.id === micro.id ? '#F7FCF9' : '#fff', borderTop: '1px solid #f5f5f5', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (selectedLocality?.id !== micro.id) e.currentTarget.style.background = '#fafafa' }}
                onMouseLeave={e => { if (selectedLocality?.id !== micro.id) e.currentTarget.style.background = '#fff' }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>{micro.name}</div>
                <div style={{ fontSize: 11, color: '#888', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>Microlocality</div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: '#aaa', fontSize: 13, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>No results for "{search}"</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
