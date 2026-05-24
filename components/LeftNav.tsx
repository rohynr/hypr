'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

type NavItem = {
  label: string
  href: string
  iconInactive: React.ReactElement
  iconActive: React.ReactElement
}

// Phosphor Bold (inactive) + Fill (active) — inlined SVGs
const NAV_ITEMS = [
  {
    label: 'Newsfeed',
    href: '/',
    iconInactive: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM184,96a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,96Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,128Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,160Z"/></svg>,
    iconActive: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM176,168H80a8,8,0,0,1,0-16h96a8,8,0,0,1,0,16Zm0-32H80a8,8,0,0,1,0-16h96a8,8,0,0,1,0,16Zm0-32H80a8,8,0,0,1,0-16h96a8,8,0,0,1,0,16Z"/></svg>,
  },
  {
    label: 'Around',
    href: '/around',
    iconInactive: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M128,16a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,16Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,192Zm0-144a64,64,0,1,0,64,64A64.07,64.07,0,0,0,128,48Zm0,112a48,48,0,1,1,48-48A48.05,48.05,0,0,1,128,160Zm0-80a32,32,0,1,0,32,32A32,32,0,0,0,128,80Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,128,128Z"/></svg>,
    iconActive: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M128,16a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,16Zm0,160a64,64,0,1,1,64-64A64.07,64.07,0,0,1,128,176Zm0-96a32,32,0,1,0,32,32A32,32,0,0,0,128,80Z"/></svg>,
  },
  {
    label: 'Civic',
    href: '/civic',
    iconInactive: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M240,208H224V136h8a8,8,0,0,0,4.9-14.31l-104-80a8,8,0,0,0-9.8,0l-104,80A8,8,0,0,0,24,136h8v72H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM40,136l88-67.69L216,136Zm48,72V176h80v32Zm96,0V168a8,8,0,0,0-8-8H80a8,8,0,0,0-8,8v40H48V152.44l80-61.55,80,61.55V208Z"/></svg>,
    iconActive: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M243.9,121.69l-104-80a8,8,0,0,0-9.8,0l-104,80A8,8,0,0,0,32,136H48v72H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16H208V136h16a8,8,0,0,0,4.9-14.31ZM168,208H88V176a40,40,0,0,1,80,0Z"/></svg>,
  },
  {
    label: 'Popular',
    href: '/popular',
    iconInactive: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l50.34-50.35a8,8,0,0,1,11.32,0L128,132.69,180.69,80H160a8,8,0,0,1,0-16h40a8,8,0,0,1,8,8v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31,40,179.31V200H224A8,8,0,0,1,232,208Z"/></svg>,
    iconActive: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M240,72v40a8,8,0,0,1-16,0V91.31l-58.34,58.35a8,8,0,0,1-11.32,0L128,123.31,69.66,181.66A8,8,0,0,1,64,184a8,8,0,0,1-5.66-13.66l64-64a8,8,0,0,1,11.32,0L160,132.69,212.69,80H192a8,8,0,0,1,0-16h40A8,8,0,0,1,240,72ZM229.66,194.34a8,8,0,0,0-11.32,11.32l.34.34H32V48a8,8,0,0,0-16,0V208a8,8,0,0,0,8,8H221.66l.34-.34A8,8,0,0,0,229.66,194.34Z"/></svg>,
  },
]

const SECONDARY_ITEMS = [
  {
    label: 'About Hypr',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a16,16,0,1,1,16,16A16,16,0,0,1,112,84Z"/></svg>,
  },
  {
    label: 'Advertise',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M200,56H152V40a8,8,0,0,0-16,0V56H56A16,16,0,0,0,40,72V184a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V72A16,16,0,0,0,200,56Zm0,128H56V72H136v88a8,8,0,0,0,16,0V72h48Z"/></svg>,
  },
  {
    label: 'Help',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm4-48a12,12,0,1,1-12-12A12,12,0,0,1,132,168Zm28-68c0,17.66-15.22,32-34,32a34.75,34.75,0,0,1-17.29-4.54,8,8,0,0,1,7.9-13.92A18.71,18.71,0,0,0,126,148c9.93,0,18-7.18,18-16s-8.07-16-18-16-18,7.18-18,16v4a8,8,0,0,1-16,0v-4c0-17.66,15.22-32,34-32S160,82.34,160,100Z"/></svg>,
  },
]

const LEGAL_ITEMS = ['Hypr Rules', 'Privacy Policy', 'User Agreement', 'Accessibility']

function LeftNav({ expanded }: { expanded: boolean }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const qs = searchParams.toString()
  const buildHref = (path: string) => qs ? `${path}?${qs}` : path

  return (
    <aside style={{
      width: expanded ? 240 : 64,
      flexShrink: 0,
      position: 'sticky',
      top: 57,
      height: 'calc(100vh - 57px)',
      overflowY: 'auto',
      overflowX: 'hidden',
      borderRight: '1px solid #EBEBEB',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
    }}>
      <div style={{ padding: expanded ? '16px 16px 0' : '16px 8px 0' }}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={buildHref(item.href)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: expanded ? 10 : 0,
                justifyContent: expanded ? 'flex-start' : 'center',
                padding: expanded ? '8px 12px' : '8px',
                marginBottom: 8,
                cursor: 'pointer',
                background: isActive ? '#F5F5F5' : 'transparent',
                color: isActive ? '#0f0f0f' : '#858585',
                fontWeight: 500,
                fontSize: 14,
                fontFamily: 'var(--font-inter), Arial, sans-serif',
                borderRadius: 8,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                transition: 'background 0.12s, color 0.12s',
                userSelect: 'none',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F5F5F5' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {isActive ? item.iconActive : item.iconInactive}
              </span>
              {expanded && item.label}
            </Link>
          )
        })}
      </div>

      <div style={{ height: 1, background: '#EBEBEB', margin: expanded ? '8px 16px' : '8px' }} />

      <div style={{ padding: expanded ? '0 16px' : '0 8px' }}>
        {SECONDARY_ITEMS.map(item => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: expanded ? 10 : 0,
              justifyContent: expanded ? 'flex-start' : 'center',
              padding: expanded ? '8px 12px' : '8px',
              marginBottom: 8,
              cursor: 'pointer',
              color: '#858585',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'var(--font-inter), Arial, sans-serif',
              borderRadius: 8,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F5F5F5'; e.currentTarget.style.color = '#0f0f0f' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#858585' }}
          >
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{item.icon}</span>
            {expanded && item.label}
          </div>
        ))}
      </div>

      {expanded && (
        <>
          <div style={{ flex: 1 }} />
          <div style={{ height: 1, background: '#EBEBEB', margin: '8px 16px' }} />
          <div style={{ padding: '8px 16px 16px' }}>
            {LEGAL_ITEMS.map(item => (
              <div key={item} style={{ padding: '4px 12px', cursor: 'pointer', color: '#bbb', fontSize: 11, fontFamily: 'var(--font-inter), Arial, sans-serif', borderRadius: 8, transition: 'color 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#555'}
                onMouseLeave={e => e.currentTarget.style.color = '#bbb'}
              >{item}</div>
            ))}
            <div style={{ padding: '12px 12px 0', color: '#ccc', fontSize: 10, fontFamily: 'var(--font-inter), Arial, sans-serif', lineHeight: 1.7 }}>
              The Hypr Company, Inc. © 2026.<br />All rights reserved.
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
import { Suspense } from 'react'

export function LeftNavWrapper(props: Parameters<typeof LeftNav>[0]) {
  return (
    <Suspense fallback={null}>
      <LeftNav {...props} />
    </Suspense>
  )
}