'use client'

import { useState, useEffect, useRef } from 'react'
import { LocationSelector, type Locality } from './LocationSelector'

export function Header({
  selectedLocality,
  localities,
  onLocalityChange,
  onToggleNav,
  isMobile,
  userProfile,
  homeLocalityId,
  workLocalityId,
}: {
  selectedLocality: Locality | null
  localities: Locality[]
  onLocalityChange: (l: Locality | null) => void
  onToggleNav: () => void
  isMobile: boolean
  userProfile: { first_name: string; last_name: string } | null
  homeLocalityId: string | null
  workLocalityId: string | null
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [profileOpen])

  const initial = userProfile?.first_name?.[0]?.toUpperCase() || 'R'

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: '#fff', borderBottom: '1px solid #EBEBEB', height: 57, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 0 }}>
      <button
        onClick={onToggleNav}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'background 0.15s, color 0.15s', marginRight: 8 }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F5'; e.currentTarget.style.color = '#111' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#555' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <img src="/hypr.svg" alt="hypr" style={{ height: 28, width: 'auto', flexShrink: 0, marginRight: 12 }} />

      <div style={{ width: 1, height: 24, background: '#E0E0E0', marginRight: 12, flexShrink: 0 }} />

      <LocationSelector selectedLocality={selectedLocality} localities={localities} onSelect={onLocalityChange} homeLocalityId={homeLocalityId} workLocalityId={workLocalityId} />

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'background 0.15s, color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F5'; e.currentTarget.style.color = '#111' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#555' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>

        {!isMobile && (
          <div ref={profileRef} style={{ position: 'relative', marginLeft: 4 }}>
            <div
              onClick={() => setProfileOpen(prev => !prev)}
              style={{ width: 32, height: 32, borderRadius: '50%', background: profileOpen ? '#D0D0D0' : '#E0E0E0', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter), Arial, sans-serif', transition: 'background 0.15s', userSelect: 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = '#D0D0D0'}
              onMouseLeave={e => { if (!profileOpen) e.currentTarget.style.background = '#E0E0E0' }}
            >
              {initial}
            </div>

            {profileOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 220, background: '#fff', border: '1px solid #EBEBEB', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 300, overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 12px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f0f0f', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                    {userProfile?.first_name} {userProfile?.last_name}
                  </div>
                  {selectedLocality && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                      📍 {selectedLocality.name}
                    </div>
                  )}
                  {(selectedLocality as any)?.admin_zones?.display_name && (
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 2, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                      {(selectedLocality as any).admin_zones.display_name}
                    </div>
                  )}
                </div>
                <div style={{ height: 1, background: '#EBEBEB' }} />
                <div
                  onClick={async () => {
                    const { createClient } = await import('@/utils/supabase/client')
                    const supabase = createClient()
                    await supabase.auth.signOut()
                    window.location.href = '/auth'
                  }}
                  style={{ padding: '12px 16px', cursor: 'pointer', fontSize: 13, color: '#E53935', fontFamily: 'var(--font-inter), Arial, sans-serif', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FFF5F5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  Sign out
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
