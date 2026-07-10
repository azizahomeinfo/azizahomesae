import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
const { render } = await import('./dist/server/entry-server.js')

function upsertHeadTag(html, tag, matcher) {
  const headClose = '</head>'
  if (!html.includes(headClose)) return html
  if (matcher.test(html)) {
    return html.replace(matcher, tag)
  }
  return html.replace(headClose, `${tag}\n${headClose}`)
}

// Sitemap configuration
const SITE_URL = 'https://www.azizahomes.com'
const routePriorities = {
  '/': { priority: '1.0', changefreq: 'daily' },
  '/about': { priority: '0.8', changefreq: 'monthly' },
  '/services': { priority: '0.9', changefreq: 'weekly' },
  '/packages': { priority: '0.9', changefreq: 'weekly' },
  '/portfolio': { priority: '0.8', changefreq: 'weekly' },
  '/contact': { priority: '0.7', changefreq: 'monthly' },
  '/blog': { priority: '0.8', changefreq: 'weekly' },
  '/minimalist-apartment-furnishing-dubai': { priority: '0.9', changefreq: 'weekly' },
  '/investors-furnishing-dubai': { priority: '0.9', changefreq: 'weekly' },
  '/furnishing/dubai-marina': { priority: '0.9', changefreq: 'weekly' },
  '/furnishing/downtown-dubai': { priority: '0.9', changefreq: 'weekly' },
  '/furnishing/business-bay': { priority: '0.9', changefreq: 'weekly' },
  '/furnishing/jumeirah-village-circle': { priority: '0.9', changefreq: 'weekly' },
  '/furnishing/palm-jumeirah': { priority: '0.9', changefreq: 'weekly' },
  '/furnishing/dubai-hills-estate': { priority: '0.9', changefreq: 'weekly' },
  '/seo-status': { priority: '0.3', changefreq: 'monthly' }
}

// Default config for blog posts and other pages
const defaultConfig = { priority: '0.7', changefreq: 'monthly' }

function generateSitemap(routes) {
  const currentDate = new Date().toISOString().split('T')[0]
  
  const urls = routes.map(route => {
    const config = routePriorities[route] || defaultConfig
    return `  <url>
    <loc>${SITE_URL}${route}</loc>
    <lastmod>${currentDate}T00:00:00+00:00</lastmod>
    <changefreq>${config.changefreq}</changefreq>
    <priority>${config.priority}</priority>
  </url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>`
}

// Copy static files that should not be prerendered (except sitemap.xml which we generate)
const staticFiles = ['robots.txt', 'llms.txt', '_headers']
staticFiles.forEach(file => {
  const sourcePath = toAbsolute(`public/${file}`)
  const destPath = toAbsolute(`dist/${file}`)
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath)
    console.log(`Copied static file: ${file}`)
  }
})

// Define routes that match the actual app routing and sitemap
// Note: Dynamic routes like /product/:handle need specific handles to be prerendered
const routesToPrerender = [
  '/',
  '/about',
  '/services',
  '/packages',
  '/portfolio',
  '/contact',
  '/blog',
  '/blog/maximize-rental-roi-downtown-dubai',
  '/blog/maximize-holiday-home-roi-dubai-marina',
  '/blog/jvc-family-rental-furnishing-roi-guide',
  '/blog/top-7-interior-design-agencies-dubai',
  '/blog/quick-efficient-ways-to-furnish-your-home',
  '/blog/where-to-invest-dubai-best-roi-property-growth',
  '/minimalist-apartment-furnishing-dubai',
  '/investors-furnishing-dubai',
  // Location × intent landing pages (src/data/locationPages.ts) — keep in sync
  '/furnishing/dubai-marina',
  '/furnishing/downtown-dubai',
  '/furnishing/business-bay',
  '/furnishing/jumeirah-village-circle',
  '/furnishing/palm-jumeirah',
  '/furnishing/dubai-hills-estate',
  '/seo-status'
  // Add specific product URLs here when you have them
  // Example: '/product/living-room-package',
]

// NOTE: Google retired the sitemap ping endpoint
// (google.com/ping?sitemap=) in 2023 and it is now a no-op. Bing deprecated
// its equivalent too. Discovery now relies on the `Sitemap:` directive in
// robots.txt plus a one-time manual submission in Google Search Console /
// Bing Webmaster Tools, so there is no automated ping step here.

;(async () => {
  // Generate and write sitemap.xml
  const sitemapContent = generateSitemap(routesToPrerender)
  fs.writeFileSync(toAbsolute('dist/sitemap.xml'), sitemapContent)
  console.log('Generated sitemap.xml with', routesToPrerender.length, 'routes')
  
  // Also update the source sitemap for development
  fs.writeFileSync(toAbsolute('public/sitemap.xml'), sitemapContent)
  console.log('Updated public/sitemap.xml')

  for (const url of routesToPrerender) {
    const { html: appHtml, helmet } = render(url);
    let html = template.replace(`<!--app-html-->`, appHtml)

    // IMPORTANT: dist/index.html is served by Lovable hosting as the SPA
    // fallback for ANY route that isn't an exact file match (including
    // /investors-furnishing-dubai, /about, etc.). If we bake the homepage's
    // Helmet tags into it, Google sees a homepage canonical/title for
    // every URL → duplicate content → won't index. So for the "/" route,
    // leave the head as the neutral source template (sitewide title +
    // description from index.html). React-Helmet sets the correct
    // homepage tags on hydration. Per-route files in subdirectories
    // still get full Helmet injection.
    if (helmet && url !== '/') {
      if (helmet.title) {
        html = html.replace(/<title[^>]*>.*?<\/title>/s, helmet.title.toString())
      }
      if (helmet.meta) {
        const metaString = helmet.meta.toString()
        const metaTags = metaString.match(/<meta[^>]*>/g) || []
        for (const tag of metaTags) {
          const nameMatch = tag.match(/\sname="([^"]+)"/i)
          const propertyMatch = tag.match(/\sproperty="([^"]+)"/i)
          const httpEquivMatch = tag.match(/\shttp-equiv="([^"]+)"/i)

          if (nameMatch) {
            const name = nameMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            html = upsertHeadTag(html, tag, new RegExp(`<meta[^>]*name="${name}"[^>]*>`, 'i'))
          } else if (propertyMatch) {
            const property = propertyMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            html = upsertHeadTag(html, tag, new RegExp(`<meta[^>]*property="${property}"[^>]*>`, 'i'))
          } else if (httpEquivMatch) {
            const httpEquiv = httpEquivMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            html = upsertHeadTag(html, tag, new RegExp(`<meta[^>]*http-equiv="${httpEquiv}"[^>]*>`, 'i'))
          } else {
            html = html.replace('</head>', `${tag}</head>`)
          }
        }
      }
      if (helmet.link) {
        const linkString = helmet.link.toString()
        const linkTags = linkString.match(/<link[^>]*>/g) || []
        for (const tag of linkTags) {
          const relMatch = tag.match(/\srel="([^"]+)"/i)
          const hrefLangMatch = tag.match(/\shreflang="([^"]+)"/i)
          if (relMatch?.[1] === 'canonical') {
            html = upsertHeadTag(html, tag, /<link[^>]*rel="canonical"[^>]*>/i)
          } else if (relMatch?.[1] === 'alternate' && hrefLangMatch) {
            const hrefLang = hrefLangMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            html = upsertHeadTag(html, tag, new RegExp(`<link[^>]*rel="alternate"[^>]*hreflang="${hrefLang}"[^>]*>`, 'i'))
          } else {
            html = html.replace('</head>', `${tag}</head>`)
          }
        }
      }
      // Inject Helmet scripts (JSON-LD structured data) into the static HTML.
      // Without this, Organization/LocalBusiness/FAQ/Service schemas only
      // exist after client-side hydration and are invisible to crawlers
      // that don't execute JavaScript.
      if (helmet.script) {
        const scriptString = helmet.script.toString()
        if (scriptString) {
          html = html.replace('</head>', `${scriptString}\n</head>`)
        }
      }
    }

    // Create directory structure for clean URLs
    // / -> /index.html
    // /about -> /about/index.html (so /about serves the HTML)
    let filePath
    if (url === '/') {
      filePath = 'dist/index.html'
    } else {
      filePath = `dist${url}/index.html`
    }
    
    const fileDir = path.dirname(toAbsolute(filePath))
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }
    
    fs.writeFileSync(toAbsolute(filePath), html)
    console.log('pre-rendered:', filePath)
  }
})()
