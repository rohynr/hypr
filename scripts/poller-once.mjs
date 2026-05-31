import Parser from 'rss-parser'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

const parser = new Parser()

async function getFeedSources() {
  const { data, error } = await supabase
    .from('feed_sources')
    .select('id, city_id, url, name')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching feed sources:', error.message)
    return []
  }
  return data
}

async function pollFeed(source) {
  console.log(`Polling: ${source.name}`)

  try {
    const feed = await parser.parseURL(source.url)

    const articles = feed.items.map((item) => ({
      source_id: source.id,
      city_id: source.city_id,
      title: item.title?.trim() || '',
      description: item.contentSnippet?.trim() || item.summary?.trim() || '',
      url: item.link || item.guid,
      image_url: item.enclosure?.url || null,
      author: item.creator || item.author || null,
      published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      classification_status: 'pending'
    }))

    const validArticles = articles.filter((a) => a.url && a.title)

    if (validArticles.length === 0) {
      console.log(`No valid articles found in ${source.name}`)
      return
    }

    const { error } = await supabase
      .from('articles')
      .upsert(validArticles, { onConflict: 'url', ignoreDuplicates: true })

    if (error) {
      console.error(`Error saving articles from ${source.name}:`, error.message)
    } else {
      console.log(`Saved ${validArticles.length} articles from ${source.name}`)
    }

    await supabase
      .from('feed_sources')
      .update({ last_polled_at: new Date().toISOString() })
      .eq('id', source.id)

  } catch (err) {
    console.error(`Failed to poll ${source.name}:`, err.message)
  }
}

async function pollAll() {
  console.log(`\nStarting poll at ${new Date().toLocaleTimeString()}`)
  const sources = await getFeedSources()
  for (const source of sources) {
    await pollFeed(source)
  }
  console.log('Poll complete.')
}

await pollAll()
process.exit(0)
