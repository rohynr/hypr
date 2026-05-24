'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { LocationSelector, type Locality } from '@/components/LocationSelector'
import { LeftNavWrapper as LeftNav } from '@/components/LeftNav'
import { Header } from '@/components/Header'

const MUMBAI_CITY_ID = '49a211bc-0e51-4ae1-97af-1b1a4f6f0a4b'
const LOCALITY_STORAGE_KEY = 'hypr.locality'

type Article = {
  id: string
  title: string
  description: string
  url: string
  image_url: string | null
  author: string | null
  published_at: string
  source_name: string
  source_url: string | null
  locality_name: string
  locality_level: string
  parent_locality_name: string | null
  admin_zone_display_name: string | null
  zone_code: string | null
  category: string | null
  confidence: number
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function cleanSourceName(name: string) {
  return name.replace(/\s*[–\-]\s*(Mumbai|India|National|Regional|City|Local).*$/i, '').trim()
}

function getFaviconUrl(sourceUrl: string | null, sourceName: string) {
  const domainMap: Record<string, string> = {
    'times of india': 'timesofindia.com',
    'the hindu': 'thehindu.com',
    'indian express': 'indianexpress.com',
    'ndtv': 'ndtv.com',
    'free press journal': 'freepressjournal.in',
    'hindustan times': 'hindustantimes.com',
    'mid-day': 'mid-day.com',
    'dna india': 'dnaindia.com',
    'mumbai live': 'mumbailive.com',
  }
  const key = Object.keys(domainMap).find(k => sourceName.toLowerCase().includes(k))
  const domain = key ? domainMap[key] : (sourceUrl ? (() => { try { return new URL(sourceUrl).hostname } catch { return null } })() : null)
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

function localityLabel(article: Article) {
  if (article.locality_level === 'microlocality' && article.parent_locality_name) {
    return `${article.locality_name}, ${article.parent_locality_name}`
  }
  return article.locality_name
}

function SourceAvatar({ name, sourceUrl }: { name: string; sourceUrl: string | null }) {
  const [imgError, setImgError] = useState(false)
  const faviconUrl = getFaviconUrl(sourceUrl, name)
  const initials = cleanSourceName(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

  if (faviconUrl && !imgError) {
    return (
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '1px solid #EBEBEB' }}>
        <img src={faviconUrl} alt={name} width={24} height={24} style={{ objectFit: 'contain' }} onError={() => setImgError(true)} />
      </div>
    )
  }
  return (
    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#EBEBEB', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, letterSpacing: '0.04em', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
      {initials}
    </div>
  )
}

function ArticleCard({ article }: { article: Article }) {
  const label = localityLabel(article)
  const displayName = cleanSourceName(article.source_name)

  return (
    <article style={{ background: '#fff', borderBottom: '1px solid #EBEBEB', padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SourceAvatar name={article.source_name} sourceUrl={article.source_url} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111', fontFamily: 'var(--font-inter), Arial, sans-serif', lineHeight: 1.3 }}>{displayName}</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2, fontFamily: 'var(--font-inter), Arial, sans-serif' }}>{timeAgo(article.published_at)}</div>
          </div>
        </div>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: '4px 8px', fontSize: 18, lineHeight: 1, letterSpacing: '0.05em', borderRadius: 6, transition: 'background 0.15s, color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.color = '#555' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#bbb' }}
        >···</button>
      </div>

      <h2 onClick={() => window.open(article.url, '_blank')} style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5, color: '#0f0f0f', marginBottom: 10, cursor: 'pointer', fontFamily: 'var(--font-inter), Arial, sans-serif', letterSpacing: '-0.01em' }}>
        {article.title}
      </h2>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 24, background: '#F7FCF9', color: '#000', fontFamily: 'var(--font-inter), Arial, sans-serif', border: '1px solid #E0F0EA' }}>{label === 'Mumbai (City-wide)' ? 'City Wide' : label}</span>
        {article.admin_zone_display_name && (
          <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 24, background: '#2B78A8', color: '#fff', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>{article.admin_zone_display_name}</span>
        )}
        {article.category && article.category !== 'other' && (
          <span style={{ fontSize: 11, fontWeight: 400, padding: '4px 10px', borderRadius: 24, background: '#F5F5F5', color: '#777', fontFamily: 'var(--font-inter), Arial, sans-serif', textTransform: 'capitalize' }}>{article.category}</span>
        )}
      </div>

      {article.image_url && (
        <div onClick={() => window.open(article.url, '_blank')} style={{ cursor: 'pointer', marginBottom: 14, borderRadius: 8, overflow: 'hidden', background: '#f5f5f5' }}>
          <img src={article.image_url} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { key: 'like', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg> },
            { key: 'comment', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
            { key: 'share', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> },
          ].map(({ key, icon }) => (
            <button key={key}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#aaa', padding: '6px 8px', borderRadius: 6, transition: 'background 0.15s, color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.color = '#555' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#aaa' }}
              onClick={key === 'share' ? () => navigator.clipboard?.writeText(`${window.location.origin}?article=${article.id}`) : undefined}
            >{icon}</button>
          ))}
        </div>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '6px 8px', borderRadius: 8, transition: 'background 0.15s, color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.color = '#555' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#aaa' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>
    </article>
  )
}

export default function Home() {
  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string } | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [localities, setLocalities] = useState<Locality[]>([])
  const [persistedLocalityId, setPersistedLocalityId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [navExpanded, setNavExpanded] = useState(true)
  useEffect(() => {
  async function init() {
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()

    const [localitiesRes] = await Promise.all([
      fetch(`/api/localities?city_id=${MUMBAI_CITY_ID}`),
    ])

    const localitiesData = await localitiesRes.json()
    const allLocalities = localitiesData.localities || []
    setLocalities(allLocalities)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('first_name, last_name, locality_id, admin_zone_id')
        .eq('id', user.id)
        .single()


      if (profile) {
  setUserProfile({ first_name: profile.first_name, last_name: profile.last_name })
}

      if (profile?.locality_id) {
        const userLocality = allLocalities.find((l: Locality) => l.id === profile.locality_id)
        if (userLocality) setPersistedLocalityId(userLocality.id)
      }
    }
  }
  init()
}, [])
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

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
    setArticles([])
    setPage(1)
    setHasMore(true)
    loadArticles(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocality])

  async function loadArticles(pageNum: number, reset = false) {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)
    const params = new URLSearchParams({ city_id: MUMBAI_CITY_ID, page: String(pageNum) })
    if (selectedLocality) params.set('locality_id', selectedLocality.id)
    const res = await fetch(`/api/feed?${params}`)
    const data = await res.json()
    const incoming: Article[] = data.articles || []
    const seen = new Set<string>()
const unique = incoming.filter((a: Article) => { if (seen.has(a.id)) return false; seen.add(a.id); return true })
    if (incoming.length < 20) setHasMore(false)
    if (reset) setArticles(unique)
    else setArticles(prev => { const ids = new Set(prev.map(a => a.id)); return [...prev, ...unique.filter(a => !ids.has(a.id))] })
    setLoading(false)
    setLoadingMore(false)
  }

  const loadMore = useCallback(() => {
  if (loadingMore || !hasMore) return
  const nextPage = page + 1
  setPage(nextPage)
  loadArticles(nextPage)
}, [page, loadingMore, hasMore, selectedLocality])

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore() }, { threshold: 0, rootMargin: '200px' })
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [loadMore])

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
<Header
  selectedLocality={selectedLocality}
  localities={localities}
  onLocalityChange={handleLocalityChange}
  onToggleNav={() => setNavExpanded(!navExpanded)}
  isMobile={isMobile}
  userProfile={userProfile}
/>

      <div style={{ paddingTop: 57, display: 'flex', minHeight: 'calc(100vh - 57px)' }}>
        {!isMobile && <LeftNav expanded={navExpanded} />}

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '24px 24px 40px', gap: 24, minWidth: 0 }}>
          <main style={{ width: '100%', maxWidth: 640, minWidth: 0, flexShrink: 1 }}>
            <div style={{ background: '#fff', padding: '0 4px' }}>
              {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#aaa', fontSize: 14 }}>Loading stories...</div>
              ) : articles.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>📭</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 8 }}>No stories yet</div>
                  <div style={{ fontSize: 14, color: '#999', lineHeight: 1.6 }}>
                    {selectedLocality ? `No articles found for ${selectedLocality.name} yet. Try a nearby locality or check back later.` : 'No articles found. Check back soon.'}
                  </div>
                </div>
              ) : (
                <>
                  {articles.map(article => <ArticleCard key={article.id} article={article} />)}
                  <div ref={sentinelRef} style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
  {loadingMore && <div style={{ fontSize: 13, color: '#aaa', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>Loading more stories...</div>}
  {!hasMore && articles.length > 0 && <div style={{ fontSize: 13, color: '#ccc', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>You're all caught up</div>}
</div>
                </>
              )}
            </div>
          </main>

          {!isMobile && (
            <aside style={{ width: 312, flexShrink: 0 }}>
              <div style={{ position: 'sticky', top: 81 }}>
                <div style={{ background: '#F6F7F8', borderRadius: 16, border: '1px solid #EBEBEB', padding: 20, color: '#bbb', fontSize: 13, textAlign: 'center', fontFamily: 'var(--font-inter), Arial, sans-serif' }}>
                  Widgets coming soon
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
