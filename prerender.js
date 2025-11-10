import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, p)

const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8')
const { render } = await import('./dist/server/entry-server.js')

// Copy static files that should not be prerendered
const staticFiles = ['sitemap.xml', 'robots.txt', 'llms.txt', '_headers']
staticFiles.forEach(file => {
  const sourcePath = toAbsolute(`public/${file}`)
  const destPath = toAbsolute(`dist/${file}`)
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath)
    console.log(`Copied static file: ${file}`)
  }
})

// Define routes that match the actual app routing and sitemap
const routesToPrerender = [
  '/',
  '/about',
  '/services',
  '/packages',
  '/portfolio',
  '/contact',
  '/blog',
  '/blog/top-7-interior-design-agencies-dubai',
  '/blog/quick-efficient-ways-to-furnish-your-home',
  '/blog/where-to-invest-dubai-best-roi-property-growth'
]

;(async () => {
  for (const url of routesToPrerender) {
    const { html: appHtml, helmet } = render(url);
    let html = template.replace(`<!--app-html-->`, appHtml)
    
    // Insert helmet tags if they exist
    if (helmet) {
      if (helmet.title) {
        html = html.replace(/<title>.*?<\/title>/, helmet.title.toString())
      }
      if (helmet.meta) {
        html = html.replace('</head>', `${helmet.meta.toString()}</head>`)
      }
      if (helmet.link) {
        html = html.replace('</head>', `${helmet.link.toString()}</head>`)
      }
    }

    const filePath = `dist${url === '/' ? '/index' : url}.html`
    const fileDir = path.dirname(toAbsolute(filePath))
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }
    
    fs.writeFileSync(toAbsolute(filePath), html)
    console.log('pre-rendered:', filePath)
  }
})()
