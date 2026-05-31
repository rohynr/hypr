/*
 * CREATE TABLE comments (
 *   id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
 *   article_id  uuid        NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
 *   user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *   content     text        NOT NULL,
 *   created_at  timestamptz NOT NULL DEFAULT now()
 * );
 * CREATE INDEX comments_article_id_idx ON comments(article_id);
 * ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Anyone can read comments"       ON comments FOR SELECT USING (true);
 * CREATE POLICY "Users can insert own comments"  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
 * CREATE POLICY "Users can delete own comments"  ON comments FOR DELETE USING (auth.uid() = user_id);
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { type Locality } from '@/components/LocationSelector'
import { LeftNavWrapper as LeftNav } from '@/components/LeftNav'
import { Header } from '@/components/Header'

const FONT = 'var(--font-inter), Arial, sans-serif'

type ArticleDetail = {
  id: string
  title: string
  description: string | null
  url: string
  image_url: string | null
  author: string | null
  published_at: string
  source_name: string
  source_url: string | null
  locality_id: string | null
  locality_name: string
  locality_level: string
  parent_locality_name: string | null
  admin_zone_display_name: string | null
  category: string | null
}

type Comment = {
  id: string
  user_id: string
  content: string
  created_at: string
  users: { first_name: string; last_name: string } | null
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
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
  const domain = key
    ? domainMap[key]
    : sourceUrl ? (() => { try { return new URL(sourceUrl).hostname } catch { return null } })() : null
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null
}

function localityLabel(a: ArticleDetail) {
  if (a.locality_level === 'microlocality' && a.parent_locality_name) {
    return `${a.locality_name}, ${a.parent_locality_name}`
  }
  return a.locality_name
}

function SourceAvatar({ name, sourceUrl }: { name: string; sourceUrl: string | null }) {
  const [imgError, setImgError] = useState(false)
  const faviconUrl = getFaviconUrl(sourceUrl, name)
  const initials = cleanSourceName(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

  if (faviconUrl && !imgError) {
    return (
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '1px solid #EBEBEB' }}>
        <img src={faviconUrl} alt={name} width={26} height={26} style={{ objectFit: 'contain' }} onError={() => setImgError(true)} />
      </div>
    )
  }
  return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EBEBEB', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, letterSpacing: '0.04em', fontFamily: FONT }}>
      {initials}
    </div>
  )
}

function UserAvatar({ name }: { name: string }) {
  const letter = name.trim()[0]?.toUpperCase() ?? '?'
  return (
    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#2BA887', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, fontFamily: FONT }}>
      {letter}
    </div>
  )
}

export default function ArticlePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)

  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string } | null>(null)
  const [homeLocalityId, setHomeLocalityId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [navExpanded, setNavExpanded] = useState(true)

  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!id) return
    async function init() {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()

      // Fetch all three in parallel; profile fetch is sequential after auth
      const [articleRes, commentsRes, authRes] = await Promise.all([
        supabase
          .from('feed')
          .select('id, title, description, url, image_url, author, published_at, source_name, source_url, locality_name, locality_level, parent_locality_name, admin_zone_display_name, category, locality_id')
          .eq('id', id),
        supabase
          .from('comments')
          .select('id, user_id, content, created_at, users(first_name, last_name)')
          .eq('article_id', id)
          .order('created_at', { ascending: false }),
        supabase.auth.getUser(),
      ])

      // Resolve profile so we can pick the best article row
      let resolvedHomeLocalityId: string | null = null
      const user = authRes.data.user
      if (user) {
        setCurrentUserId(user.id)
        const { data: profile } = await supabase
          .from('users')
          .select('first_name, last_name, locality_id')
          .eq('id', user.id)
          .single()
        if (profile) {
          setUserProfile({ first_name: profile.first_name, last_name: profile.last_name })
          if (profile.locality_id) {
            resolvedHomeLocalityId = profile.locality_id
            setHomeLocalityId(profile.locality_id)
          }
        }
      }

      // Pick the row that matches homeLocality, or fall back to the first row
      const rows = articleRes.data ?? []
      const best =
        (resolvedHomeLocalityId && rows.find((r: any) => r.locality_id === resolvedHomeLocalityId)) ||
        rows[0] ||
        null

      if (!best) {
        setNotFound(true)
      } else {
        setArticle(best as ArticleDetail)
      }
      setComments((commentsRes.data || []) as unknown as Comment[])
      setLoading(false)
    }
    init()
  }, [id])

  async function handlePostComment() {
    if (!commentText.trim() || !currentUserId || !id) return
    setSubmitting(true)
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('comments')
      .insert({ article_id: id, user_id: currentUserId, content: commentText.trim() })
      .select('id, user_id, content, created_at, users(first_name, last_name)')
      .single()
    if (!error && data) {
      setComments(prev => [data as unknown as Comment, ...prev])
      setCommentText('')
    }
    setSubmitting(false)
  }

  function handleShare() {
    navigator.clipboard?.writeText(`https://hyprapp.in/article/${id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <div style={{ fontSize: 14, color: '#aaa' }}>Loading...</div>
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, gap: 12 }}>
        <div style={{ fontSize: 32 }}>📰</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>Article not found</div>
        <button onClick={() => router.push('/')} style={{ marginTop: 8, fontSize: 13, color: '#2BA887', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT }}>← Back to feed</button>
      </div>
    )
  }

  const label = localityLabel(article)
  const displayName = cleanSourceName(article.source_name)

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT }}>
      <Header
        selectedLocality={null}
        localities={[] as Locality[]}
        onLocalityChange={() => router.push('/')}
        onToggleNav={() => setNavExpanded(!navExpanded)}
        isMobile={isMobile}
        userProfile={userProfile}
        homeLocalityId={homeLocalityId}
        workLocalityId={null}
      />

      <div style={{ paddingTop: 57, display: 'flex', minHeight: 'calc(100vh - 57px)' }}>
        {!isMobile && <LeftNav expanded={navExpanded} />}

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '24px 24px 60px', gap: 24, minWidth: 0 }}>
          <main style={{ width: '100%', maxWidth: 640, minWidth: 0, flexShrink: 1 }}>

            {/* Back link */}
            <button
              onClick={() => router.back()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13, fontFamily: FONT, padding: '0 0 20px', transition: 'color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#111' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#888' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>

            {/* Source row */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SourceAvatar name={article.source_name} sourceUrl={article.source_url} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111', fontFamily: FONT }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2, fontFamily: FONT }}>{timeAgo(article.published_at)}</div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 24, background: '#F7FCF9', color: '#000', fontFamily: FONT, border: '1px solid #E0F0EA' }}>
                {label === 'Mumbai (City-wide)' ? 'City Wide' : label}
              </span>
              {article.admin_zone_display_name && (
                <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 24, background: '#2B78A8', color: '#fff', fontFamily: FONT }}>
                  {article.admin_zone_display_name}
                </span>
              )}
              {article.category && article.category !== 'other' && (
                <span style={{ fontSize: 11, fontWeight: 400, padding: '4px 10px', borderRadius: 24, background: '#F5F5F5', color: '#777', fontFamily: FONT, textTransform: 'capitalize' }}>
                  {article.category}
                </span>
              )}
            </div>

            {/* Headline */}
            <h1 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.4, color: '#0f0f0f', marginBottom: 20, fontFamily: FONT }}>
              {article.title}
            </h1>

            {/* Image */}
            {article.image_url && (
              <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', background: '#f5f5f5' }}>
                <img
                  src={article.image_url}
                  alt=""
                  style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }}
                  onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                />
              </div>
            )}

            {/* Description */}
            {article.description && (
              <p style={{ fontSize: 15, color: '#444', lineHeight: 1.7, fontFamily: FONT, marginBottom: 24 }}>
                {article.description}
              </p>
            )}

            {/* Read full article CTA */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#2BA887', color: '#fff', padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: FONT, textDecoration: 'none', transition: 'background 0.15s', marginBottom: 24 }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#239973' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#2BA887' }}
            >
              Read full article
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>

            {/* Action bar */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
              {[
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>, label: 'Like' },
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, label: `${comments.length} Comment${comments.length !== 1 ? 's' : ''}` },
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>, label: copied ? 'Copied!' : 'Share', onClick: handleShare, active: copied },
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>, label: 'Bookmark' },
              ].map(({ icon, label, onClick, active }) => (
                <button
                  key={label.replace(/\d+/, '#')}
                  onClick={onClick}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F0F0F0', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 13, fontFamily: FONT, color: active ? '#2BA887' : '#444', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E0E0E0' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F0F0F0' }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid #EBEBEB', marginBottom: 28 }} />

            {/* Discussion */}
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0f0f0f', fontFamily: FONT, marginBottom: 16 }}>Discussion</div>

            {currentUserId ? (
              <div style={{ display: 'flex', gap: 10, marginBottom: 28, alignItems: 'flex-start' }}>
                {userProfile && <UserAvatar name={userProfile.first_name} />}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Share your thoughts..."
                    rows={3}
                    style={{ width: '100%', border: '1px solid #EBEBEB', borderRadius: 8, padding: '12px', fontSize: 14, fontFamily: FONT, color: '#111', background: '#fff', resize: 'vertical', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2BA887' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#EBEBEB' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handlePostComment}
                      disabled={!commentText.trim() || submitting}
                      style={{ background: commentText.trim() && !submitting ? '#2BA887' : '#C8E6DC', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: commentText.trim() && !submitting ? 'pointer' : 'default', transition: 'background 0.15s' }}
                    >
                      {submitting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 24, fontSize: 13, color: '#999', fontFamily: FONT }}>
                <button onClick={() => router.push('/auth')} style={{ color: '#2BA887', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, fontSize: 13, padding: 0 }}>Sign in</button> to join the discussion.
              </div>
            )}

            {/* Comments list */}
            {comments.length === 0 ? (
              <div style={{ fontSize: 13, color: '#bbb', fontFamily: FONT, paddingBottom: 16 }}>No comments yet. Be the first.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {comments.map(c => {
                  const name = c.users ? `${c.users.first_name} ${c.users.last_name}` : 'User'
                  return (
                    <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <UserAvatar name={c.users?.first_name ?? 'U'} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111', fontFamily: FONT }}>{name}</span>
                          <span style={{ fontSize: 12, color: '#888', fontFamily: FONT }}>{timeAgo(c.created_at)}</span>
                        </div>
                        <div style={{ fontSize: 14, color: '#333', fontFamily: FONT, lineHeight: 1.55 }}>{c.content}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}


          </main>

          {!isMobile && (
            <aside style={{ width: 312, flexShrink: 0 }}>
              <div style={{ position: 'sticky', top: 81 }}>
                <div style={{ background: '#F6F7F8', borderRadius: 16, border: '1px solid #EBEBEB', padding: 20, color: '#bbb', fontSize: 13, textAlign: 'center', fontFamily: FONT }}>
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
