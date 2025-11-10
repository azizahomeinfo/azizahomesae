import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Validating sitemap.xml configuration...\n');

// Check 1: Verify sitemap.xml exists in public folder
const publicSitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
if (fs.existsSync(publicSitemapPath)) {
  console.log('✅ sitemap.xml exists in public folder');
  
  // Check if it's valid XML
  const content = fs.readFileSync(publicSitemapPath, 'utf-8');
  if (content.trim().startsWith('<?xml') && content.includes('<urlset')) {
    console.log('✅ sitemap.xml has valid XML structure');
  } else {
    console.log('❌ sitemap.xml does not appear to be valid XML');
  }
} else {
  console.log('❌ sitemap.xml NOT found in public folder');
}

// Check 2: Verify headers configuration exists
const headersPath = path.join(__dirname, 'public', '_headers');
if (fs.existsSync(headersPath)) {
  const headers = fs.readFileSync(headersPath, 'utf-8');
  if (headers.includes('sitemap.xml') && headers.includes('application/xml')) {
    console.log('✅ _headers file configured for sitemap.xml');
  } else {
    console.log('❌ _headers file missing sitemap.xml configuration');
  }
} else {
  console.log('⚠️  _headers file not found');
}

// Check 3: Verify netlify.toml configuration
const netlifyPath = path.join(__dirname, 'netlify.toml');
if (fs.existsSync(netlifyPath)) {
  const netlify = fs.readFileSync(netlifyPath, 'utf-8');
  if (netlify.includes('sitemap.xml') && netlify.includes('application/xml')) {
    console.log('✅ netlify.toml configured for sitemap.xml');
  } else {
    console.log('❌ netlify.toml missing sitemap.xml configuration');
  }
} else {
  console.log('⚠️  netlify.toml not found');
}

// Check 4: Verify vercel.json configuration
const vercelPath = path.join(__dirname, 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const vercel = fs.readFileSync(vercelPath, 'utf-8');
  if (vercel.includes('sitemap.xml') && vercel.includes('application/xml')) {
    console.log('✅ vercel.json configured for sitemap.xml');
  } else {
    console.log('❌ vercel.json missing sitemap.xml configuration');
  }
} else {
  console.log('⚠️  vercel.json not found');
}

// Check 5: Verify vite.config.ts preserves sitemap.xml
const viteConfigPath = path.join(__dirname, 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
  if (viteConfig.includes('sitemap.xml')) {
    console.log('✅ vite.config.ts configured to preserve sitemap.xml');
  } else {
    console.log('❌ vite.config.ts missing sitemap.xml configuration');
  }
}

// Check 6: If dist folder exists, verify sitemap.xml is there
const distSitemapPath = path.join(__dirname, 'dist', 'sitemap.xml');
if (fs.existsSync(distSitemapPath)) {
  console.log('✅ sitemap.xml exists in dist folder (build output)');
  
  const distContent = fs.readFileSync(distSitemapPath, 'utf-8');
  if (distContent.trim().startsWith('<?xml') && distContent.includes('<urlset')) {
    console.log('✅ dist/sitemap.xml has valid XML structure');
  } else {
    console.log('❌ dist/sitemap.xml does not appear to be valid XML');
  }
} else {
  console.log('⚠️  sitemap.xml NOT found in dist folder (run build first)');
}

console.log('\n📝 To test deployed sitemap:');
console.log('   curl -I https://azizahomes.com/sitemap.xml');
console.log('   (Should show Content-Type: application/xml)');
console.log('\n📝 To view deployed sitemap:');
console.log('   curl https://azizahomes.com/sitemap.xml');
console.log('   (Should show XML content, not HTML)');
