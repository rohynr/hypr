import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

// ── Duplicate detection ───────────────────────────────────────

function tokenise(title) {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2) // ignore short words like "in", "at", "a"
  )
}

function jaccardSimilarity(a, b) {
  const tokensA = tokenise(a)
  const tokensB = tokenise(b)
  if (tokensA.size === 0 || tokensB.size === 0) return 0
  const intersection = new Set([...tokensA].filter(t => tokensB.has(t)))
  const union = new Set([...tokensA, ...tokensB])
  return intersection.size / union.size
}

const DUPLICATE_THRESHOLD = 0.6  // 60% word overlap = duplicate
const DUPLICATE_WINDOW_HOURS = 24 // only compare articles from last 24 hours

async function findDuplicates(articles) {
  // Fetch recent articles to compare against
  const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  
  const { data: recentArticles, error } = await supabase
    .from('articles')
    .select('id, title, published_at')
    .gte('published_at', windowStart)
    .is('duplicate_of', null)
    .eq('classification_status', 'done')

  if (error) {
    console.error('Error fetching recent articles:', error.message)
    return {}
  }

  const duplicateMap = {} // article_id → canonical_id

  for (const article of articles) {
    for (const recent of recentArticles) {
      // Don't compare an article to itself
      if (article.id === recent.id) continue
      // Don't mark an article as duplicate of another in the same batch
      if (duplicateMap[recent.id]) continue

      const similarity = jaccardSimilarity(article.title, recent.title)
      if (similarity >= DUPLICATE_THRESHOLD) {
        // Mark the newer article as duplicate of the older one
        const articleDate = new Date(article.published_at || 0)
        const recentDate = new Date(recent.published_at || 0)
        if (articleDate >= recentDate) {
          duplicateMap[article.id] = recent.id
        } else {
          duplicateMap[recent.id] = article.id
        }
        break
      }
    }
  }

  return duplicateMap
}

// ── Category detection ────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  crime:          ['murder', 'theft', 'robbery', 'arrested', 'police', 'fir', 'crime', 'assault', 'rape', 'kidnap', 'fraud', 'scam', 'accused', 'custody', 'bail', 'court', 'judge', 'verdict', 'sentence', 'criminal'],
  infrastructure: ['road', 'pothole', 'bridge', 'flyover', 'construction', 'repair', 'metro', 'railway', 'station', 'highway', 'footpath', 'signal', 'underpass', 'overpass', 'bmc', 'tender', 'project', 'infrastructure'],
  civic:          ['bmc', 'municipal', 'corporator', 'ward', 'garbage', 'waste', 'drainage', 'sewage', 'water supply', 'electricity', 'power cut', 'outage', 'encroachment', 'hawker', 'demolition', 'notice'],
  politics:       ['mla', 'mp', 'minister', 'election', 'party', 'bjp', 'congress', 'shiv sena', 'ncp', 'vote', 'campaign', 'rally', 'manifesto', 'political', 'government', 'assembly', 'parliament', 'corporator'],
  business:       ['market', 'economy', 'startup', 'company', 'investment', 'stock', 'trade', 'business', 'industry', 'employment', 'job', 'factory', 'commercial', 'retail', 'property', 'real estate'],
  culture:        ['festival', 'event', 'concert', 'exhibition', 'art', 'theatre', 'film', 'movie', 'music', 'heritage', 'temple', 'church', 'mosque', 'celebration', 'award', 'culture', 'tradition'],
  sports:         ['cricket', 'football', 'match', 'tournament', 'player', 'team', 'ipl', 'stadium', 'sport', 'athlete', 'championship', 'league', 'coach', 'training', 'medal'],
  traffic:        ['traffic', 'jam', 'congestion', 'accident', 'signal', 'diversion', 'route', 'commute', 'transport', 'bus', 'auto', 'cab', 'parking', 'speeding', 'drunk driving']
}

function detectCategory(rssCategory, title, description) {
  // First try RSS category
  if (rssCategory) {
    const rss = rssCategory.toLowerCase()
    if (rss.includes('crime') || rss.includes('police'))       return 'crime'
    if (rss.includes('infrastructure') || rss.includes('road')) return 'infrastructure'
    if (rss.includes('civic') || rss.includes('bmc'))          return 'civic'
    if (rss.includes('politics') || rss.includes('election'))  return 'politics'
    if (rss.includes('business') || rss.includes('economy'))   return 'business'
    if (rss.includes('culture') || rss.includes('entertainment')) return 'culture'
    if (rss.includes('sport'))                                  return 'sports'
    if (rss.includes('traffic') || rss.includes('transport'))  return 'traffic'
  }

  // Fall back to keyword scan on title + description
  const text = `${title} ${description || ''}`.toLowerCase()
  let bestCategory = 'other'
  let bestScore = 0

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => text.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }

  return bestCategory
}

// ── Locality matching ─────────────────────────────────────────

async function getLocalities() {
  const { data, error } = await supabase
    .from('localities')
    .select('id, name, level, aliases, pincodes, admin_zone_id')

  if (error) {
    console.error('Error fetching localities:', error.message)
    return []
  }
  return data
}

async function getCityWideLocality() {
  const { data, error } = await supabase
    .from('localities')
    .select('id, name, aliases')
    .is('admin_zone_id', null)
    .is('parent_id', null)
    .ilike('name', 'Mumbai%')
    .limit(1)

  if (error || !data || data.length === 0) return null
  return data[0]
}

async function getPendingArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, description, rss_category, published_at')
    .eq('classification_status', 'pending')
    .limit(100)

  if (error) {
    console.error('Error fetching articles:', error.message)
    return []
  }
  return data
}

function buildSearchTerms(locality) {
  const terms = [
    locality.name.toLowerCase(),
    ...(locality.aliases || []).map(a => a.toLowerCase()),
    ...(locality.pincodes || [])
  ]
  return [...new Set(terms)]
}

function classifyLocality(article, localities, cityWideLocality) {
  const text = `${article.title} ${article.description || ''}`.toLowerCase()
  const matches = []

  for (const locality of localities) {
    if (cityWideLocality && locality.id === cityWideLocality.id) continue

    const terms = buildSearchTerms(locality)
    const matched = terms.some(term => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'i')
      return regex.test(text)
    })

    if (matched) {
      matches.push({
        article_id: article.id,
        locality_id: locality.id,
        confidence: 0.7,
        method: 'keyword'
      })
    }
  }

  // City-wide fallback
  if (matches.length === 0 && cityWideLocality) {
    const cityTerms = buildSearchTerms(cityWideLocality)
    const isCityWide = cityTerms.some(term => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'i')
      return regex.test(text)
    })

    if (isCityWide) {
      matches.push({
        article_id: article.id,
        locality_id: cityWideLocality.id,
        confidence: 0.6,
        method: 'keyword'
      })
    }
  }

  return matches
}

// ── Main classifier ───────────────────────────────────────────

async function classify() {
  console.log('\nStarting classification...')

  const [localities, cityWideLocality, articles] = await Promise.all([
    getLocalities(),
    getCityWideLocality(),
    getPendingArticles()
  ])

  if (articles.length === 0) {
    console.log('No pending articles to classify.')
    return
  }

  console.log(`Classifying ${articles.length} articles against ${localities.length} localities...`)

  // ── Step 1: Detect duplicates
  const duplicateMap = await findDuplicates(articles)
  const duplicateIds = Object.keys(duplicateMap)
  if (duplicateIds.length > 0) {
    console.log(`Found ${duplicateIds.length} duplicates`)
    for (const [articleId, canonicalId] of Object.entries(duplicateMap)) {
      await supabase
        .from('articles')
        .update({ duplicate_of: canonicalId, classification_status: 'done' })
        .eq('id', articleId)
    }
  }

  // ── Step 2: Classify non-duplicate articles
  const nonDuplicates = articles.filter(a => !duplicateMap[a.id])
  const allMatches = []
  const classifiedIds = []
  const unclassifiedIds = []

  for (const article of nonDuplicates) {
    // Detect category
    const category = detectCategory(article.rss_category, article.title, article.description)

    // Detect locality matches
    const matches = classifyLocality(article, localities, cityWideLocality)

    // Update category on article
    await supabase
      .from('articles')
      .update({ category })
      .eq('id', article.id)

    if (matches.length > 0) {
      allMatches.push(...matches)
      classifiedIds.push(article.id)
    } else {
      unclassifiedIds.push(article.id)
    }
  }

  // ── Step 3: Save locality matches
  if (allMatches.length > 0) {
    const { error } = await supabase
      .from('article_localities')
      .upsert(allMatches, { onConflict: 'article_id,locality_id', ignoreDuplicates: true })

    if (error) {
      console.error('Error saving matches:', error.message)
    } else {
      console.log(`Matched ${classifiedIds.length} articles to localities`)
    }
  }

  // ── Step 4: Mark as done
  if (classifiedIds.length > 0) {
    await supabase
      .from('articles')
      .update({ classification_status: 'done' })
      .in('id', classifiedIds)
  }

  if (unclassifiedIds.length > 0) {
    await supabase
      .from('articles')
      .update({ classification_status: 'done' })
      .in('id', unclassifiedIds)
    console.log(`${unclassifiedIds.length} articles had no locality match`)
  }

  console.log(`Categories assigned. Duplicates found: ${duplicateIds.length}`)
  console.log('Classification complete.')
}

classify()
