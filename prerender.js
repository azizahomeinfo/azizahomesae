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
  '/seo-status'
  // Add specific product URLs here when you have them
  // Example: '/product/living-room-package',
]

// Function to submit sitemap to Google Search Console
async function submitSitemapToGoogle(sitemapUrl) {
  try {
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
    const response = await fetch(pingUrl)
    if (response.ok) {
      console.log('✓ Sitemap successfully submitted to Google Search Console')
    } else {
      console.log('⚠ Google sitemap ping returned status:', response.status)
    }
  } catch (error) {
    console.log('⚠ Could not ping Google (this is normal in local builds):', error.message)
  }
}

;(async () => {
  // Generate and write sitemap.xml
  const sitemapContent = generateSitemap(routesToPrerender)
  fs.writeFileSync(toAbsolute('dist/sitemap.xml'), sitemapContent)
  console.log('Generated sitemap.xml with', routesToPrerender.length, 'routes')
  
  // Also update the source sitemap for development
  fs.writeFileSync(toAbsolute('public/sitemap.xml'), sitemapContent)
  console.log('Updated public/sitemap.xml')
  
  // Submit sitemap to Google Search Console
  const sitemapUrl = `${SITE_URL}/sitemap.xml`
  await submitSitemapToGoogle(sitemapUrl)
  
  for (const url of routesToPrerender) {
    const { html: appHtml, helmet } = render(url);
    let html = template.replace(`<!--app-html-->`, appHtml)
    
    // Insert helmet tags if they exist
    if (helmet) {
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
