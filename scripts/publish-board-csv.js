#!/usr/bin/env node

const fs = require('node:fs/promises')
const path = require('node:path')

async function main() {
  const csvPath = process.argv[2]
  const siteUrl = process.env.SITE_URL || 'https://gooliuzboozler.com'
  const adminKey = process.env.ADMIN_KEY

  if (!csvPath) {
    throw new Error('Usage: ADMIN_KEY=... node scripts/publish-board-csv.js /path/to/all-in-one.csv')
  }

  if (!adminKey) {
    throw new Error('ADMIN_KEY is required')
  }

  const csv = await fs.readFile(path.resolve(csvPath), 'utf8')
  const response = await fetch(`${siteUrl.replace(/\/$/, '')}/api/upload-board`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
    },
    body: JSON.stringify({ csv }),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `Upload failed with HTTP ${response.status}`)
  }

  console.log(JSON.stringify(data, null, 2))
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
