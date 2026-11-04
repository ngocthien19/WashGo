import { mkdir, writeFile } from 'node:fs/promises'

const source = 'https://tinhthanhpho.com/data/provinces.geojson'
const response = await fetch(source, { signal: AbortSignal.timeout(30000) })
if (!response.ok) {
  throw new Error(`Province dataset: HTTP ${response.status}`)
}
const data = await response.json()
if (data.type !== 'FeatureCollection' || !data.features?.length || data.metadata?.license !== 'CC BY 4.0') {
  throw new Error('Unexpected province dataset or license; review before importing')
}
const destination = new URL('../public/data/customer/provinces/', import.meta.url)
await mkdir(destination, { recursive: true })
await writeFile(new URL('boundaries.json', destination), JSON.stringify(data))
await writeFile(new URL('SOURCE.md', destination), `# Current Vietnamese province boundaries

Source and attribution: tinhthanhpho.com — ${source}
Version: ${data.metadata.data_version}; generated: ${data.metadata.generated_at}.
License: Creative Commons Attribution 4.0 — https://creativecommons.org/licenses/by/4.0/
Original sources and boundary contributors are retained in boundaries.json metadata.
Changes: JSON whitespace removed only. Geometry and names are unchanged.
This community dataset represents ${data.features.length} provinces/cities after the 2025 mergers.
Simplified boundaries are address suggestions; users should review points near borders.
Refresh deliberately with: node scripts/import-province-boundaries.mjs
`)
console.log(`Imported ${data.features.length} provinces, version ${data.metadata.data_version}`)
