import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

async function extractOgImage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Hypr/1.0)',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return null

    const html = await response.text()

    // Try og:image first
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    if (ogMatch?.[1]) return ogMatch[1]

    // Fall back to twitter:image
    const twitterMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i)
    if (twitterMatch?.[1]) return twitterMatch[1]

    return null
  } catch {
    return null
  }
}

async function fetchImages() {
  console.log('\nFetching og:images for articles without images...')

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, url')
    .is('image_url', null)
    .eq('classification_status', 'done')
    .limit(50)

  if (error) {
    console.error('Error fetching articles:', error.message)
    return
  }

  if (articles.length === 0) {
    console.log('No articles without images found.')
    return
  }

  console.log(`Processing ${articles.length} articles...`)

  let found = 0
  let notFound = 0

  for (const article of articles) {
    const imageUrl = await extractOgImage(article.url)

    if (imageUrl) {
      await supabase
        .from('articles')
        .update({ image_url: imageUrl })
        .eq('id', article.id)
      found++
      process.stdout.write(`✓ `)
    } else {
      notFound++
      process.stdout.write(`. `)
    }
  }

  console.log(`\n\nDone. Found images: ${found}, Not found: ${notFound}`)
}

fetchImages()