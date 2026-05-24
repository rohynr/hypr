'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

const MUMBAI_CITY_ID = '49a211bc-0e51-4ae1-97af-1b1a4f6f0a4b'

type AdminZone = {
  display_name: string
  zone_code: string
  lat: number | null
  lon: number | null
}

type Locality = {
  id: string
  name: string
  level: string
  parent_id: string | null
  admin_zone_id: string | null
  lat: number | null
  lon: number | null
  admin_zones: AdminZone | null
}

type SelectedLocality = Locality & { parent?: Locality }

export default function OnboardingPage() {
  const supabase = createClient()

  const [step, setStep] = useState<'personal' | 'address' | 'done'>('personal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')

  const [flat, setFlat] = useState('')
  const [building, setBuilding] = useState('')
  const [street, setStreet] = useState('')
  const [pincode, setPincode] = useState('')

  const [localities, setLocalities] = useState<Locality[]>([])
  const [localityQuery, setLocalityQuery] = useState('')
  const [localityOpen, setLocalityOpen] = useState(false)
  const [selectedLocality, setSelectedLocality] = useState<SelectedLocality | null>(null)
  const localityRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/localities?city_id=${MUMBAI_CITY_ID}`)
      .then(r => r.json())
      .then(d => {
        setLocalities(d.localities || [])
      })
      .catch(err => console.error('Failed to load localities:', err))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (localityRef.current && !localityRef.current.contains(e.target as Node)) {
        setLocalityOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredLocalities = localities.filter(l =>
    l.name.toLowerCase().includes(localityQuery.toLowerCase())
  ).slice(0, 8)

  function getWardLabel(loc: SelectedLocality): string | null {
    if (loc.admin_zones?.display_name) return loc.admin_zones.display_name
    if (loc.parent?.admin_zones?.display_name) return loc.parent.admin_zones.display_name
    return null
  }

  async function handlePersonalNext() {
    if (!firstName || !lastName || !dob) {
      setError('Please fill in all fields')
      return
    }
    setError('')
    setStep('address')
  }

  async function handleSubmit() {
    if (!flat || !building || !street || !pincode || !selectedLocality) {
      setError('Please fill in all fields including your locality')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/auth'
      return
    }

    const { error } = await supabase.from('users').upsert({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      dob,
      flat,
      building,
      street,
      pincode,
      locality_id: selectedLocality.id,
      city_id: MUMBAI_CITY_ID,
      admin_zone_id: selectedLocality?.admin_zone_id || null,
    })

    if (error) {
      console.error('Supabase error:', error)
      setError(error.message)
      setLoading(false)
      return
    }

    setStep('done')
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '11px 13px',
    borderRadius: 8, border: '1px solid #E0E0E0',
    fontSize: 14, outline: 'none',
    fontFamily: 'var(--font-inter), Arial, sans-serif',
    color: '#0f0f0f', background: '#fafafa',
    transition: 'border-color 0.15s',
  }

  const labelStyle = {
    display: 'block' as const, fontSize: 11, fontWeight: 500 as const,
    color: '#555', marginBottom: 5,
    textTransform: 'uppercase' as const, letterSpacing: '0.04em',
    fontFamily: 'var(--font-inter), Arial, sans-serif',
  }

  const rowStyle = {
    display: 'flex', gap: 12, marginBottom: 14,
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#fafafa',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-inter), Arial, sans-serif',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff', borderRadius: 16,
        border: '1px solid #EBEBEB',
        padding: '40px 40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>

        <div style={{ marginBottom: 32 }}>
          <img src="/hypr.svg" alt="hypr" style={{ height: 24, width: 'auto' }} />
        </div>

        {step === 'done' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{
              fontSize: 22, fontWeight: 700, color: '#0f0f0f',
              marginBottom: 8, fontFamily: 'var(--font-inter), Arial, sans-serif',
            }}>
              Welcome, {firstName}!
            </h2>
            <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, marginBottom: 28 }}>
              Your feed is ready. We'll show you news from {selectedLocality?.name} and nearby areas.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                width: '100%', padding: '13px',
                borderRadius: 8, border: 'none',
                background: '#2BA887', color: '#fff',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-inter), Arial, sans-serif',
              }}
            >
              Read Today's News →
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
              {['personal', 'address'].map((s) => (
                <div key={s} style={{
                  height: 3, flex: 1, borderRadius: 2,
                  background: s === 'personal' || step === 'address'
                    ? '#2BA887' : '#EBEBEB',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>

            {step === 'personal' && (
              <>
                <h2 style={{
                  fontSize: 20, fontWeight: 700, color: '#0f0f0f',
                  marginBottom: 6, fontFamily: 'var(--font-inter), Arial, sans-serif',
                }}>
                  Tell us about yourself
                </h2>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
                  Just the basics to get you set up.
                </p>

                <div style={rowStyle}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>First Name</label>
                    <input
                      style={inputStyle} type="text" placeholder="Riya"
                      value={firstName} onChange={e => setFirstName(e.target.value)}
                      onFocus={e => e.target.style.borderColor = '#2BA887'}
                      onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Last Name</label>
                    <input
                      style={inputStyle} type="text" placeholder="Mehta"
                      value={lastName} onChange={e => setLastName(e.target.value)}
                      onFocus={e => e.target.style.borderColor = '#2BA887'}
                      onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Date of Birth</label>
                  <input
                    style={inputStyle} type="date"
                    value={dob} onChange={e => setDob(e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#2BA887'}
                    onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                  />
                </div>

                {error && <div style={{ fontSize: 13, color: '#E53935', marginBottom: 12 }}>{error}</div>}

                <button
                  onClick={handlePersonalNext}
                  style={{
                    width: '100%', padding: '13px',
                    borderRadius: 8, border: 'none',
                    background: '#2BA887', color: '#fff',
                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-inter), Arial, sans-serif',
                    marginTop: 8,
                  }}
                >
                  Continue →
                </button>
              </>
            )}

            {step === 'address' && (
              <>
                <h2 style={{
                  fontSize: 20, fontWeight: 700, color: '#0f0f0f',
                  marginBottom: 6, fontFamily: 'var(--font-inter), Arial, sans-serif',
                }}>
                  Your address
                </h2>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>
                  This is how we personalise your news feed.
                </p>

                <div style={rowStyle}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Flat / Unit</label>
                    <input
                      style={inputStyle} type="text" placeholder="B-704"
                      value={flat} onChange={e => setFlat(e.target.value)}
                      onFocus={e => e.target.style.borderColor = '#2BA887'}
                      onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                    />
                  </div>
                  <div style={{ flex: 1.6 }}>
                    <label style={labelStyle}>Building / Society</label>
                    <input
                      style={inputStyle} type="text" placeholder="Sea Breeze CHS"
                      value={building} onChange={e => setBuilding(e.target.value)}
                      onFocus={e => e.target.style.borderColor = '#2BA887'}
                      onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Street</label>
                  <input
                    style={inputStyle} type="text" placeholder="14th Road, SV Road…"
                    value={street} onChange={e => setStreet(e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#2BA887'}
                    onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                  />
                </div>

                <div style={{ marginBottom: 14 }} ref={localityRef}>
                  <label style={labelStyle}>Locality</label>
                  {selectedLocality ? (
                    <div style={{
                      padding: '10px 13px', borderRadius: 8,
                      border: '1px solid #2BA887', background: '#F7FCF9',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#0f0f0f' }}>
                          {selectedLocality.name}
                        </div>
                        {getWardLabel(selectedLocality) && (
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                            {getWardLabel(selectedLocality)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => { setSelectedLocality(null); setLocalityQuery('') }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 12, color: '#888', padding: 4,
                        }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <input
                        style={inputStyle}
                        type="text"
                        placeholder="Search your area, e.g. Kalina, Pali Hill…"
                        value={localityQuery}
                        onChange={e => { setLocalityQuery(e.target.value); setLocalityOpen(true) }}
                        onFocus={e => { e.target.style.borderColor = '#2BA887'; setLocalityOpen(true) }}
                        onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                      />
                      {localityOpen && localityQuery.length >= 2 && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                          background: '#fff', border: '1px solid #E8E8E8',
                          borderRadius: 8, zIndex: 100, overflow: 'hidden',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                        }}>
                          {filteredLocalities.length > 0 ? filteredLocalities.map(l => (
                            <div
                              key={l.id}
                              onMouseDown={() => {
                                const parent = l.parent_id
                                  ? localities.find(p => p.id === l.parent_id) || null
                                  : null
                                setSelectedLocality({ ...l, parent: parent || undefined })
                                setLocalityQuery(l.name)
                                setLocalityOpen(false)
                              }}
                              style={{
                                padding: '10px 14px', cursor: 'pointer',
                                borderBottom: '1px solid #f5f5f5',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                            >
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{l.name}</div>
                              <div style={{ fontSize: 11, color: '#888', marginTop: 2, textTransform: 'capitalize' }}>
                                {l.level}{l.admin_zones?.display_name ? ` · ${l.admin_zones.display_name}` : ''}
                              </div>
                            </div>
                          )) : (
                            <div style={{ padding: 14, fontSize: 13, color: '#aaa', textAlign: 'center' }}>
                              No results — try a nearby landmark or area name
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 5 }}>
                    Write it how you know it — we'll figure out the ward
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Pincode</label>
                  <input
                    style={inputStyle} type="tel" maxLength={6} placeholder="400050"
                    value={pincode} onChange={e => setPincode(e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#2BA887'}
                    onBlur={e => e.target.style.borderColor = '#E0E0E0'}
                  />
                </div>

                {error && <div style={{ fontSize: 13, color: '#E53935', marginBottom: 12 }}>{error}</div>}

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    onClick={() => { setStep('personal'); setError('') }}
                    style={{
                      flex: 1, padding: '13px',
                      borderRadius: 8, border: '1px solid #E0E0E0',
                      background: '#fff', color: '#555',
                      fontSize: 14, cursor: 'pointer',
                      fontFamily: 'var(--font-inter), Arial, sans-serif',
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                      flex: 2, padding: '13px',
                      borderRadius: 8, border: 'none',
                      background: loading ? '#E0E0E0' : '#2BA887',
                      color: loading ? '#aaa' : '#fff',
                      fontSize: 15, fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-inter), Arial, sans-serif',
                    }}
                  >
                    {loading ? 'Saving...' : 'Complete Setup →'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
