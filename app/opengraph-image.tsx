import { buildOgImage, ogSize } from './lib/og'
import { loadCurrentData } from './data'

export const runtime = 'nodejs'
export const size = ogSize
export const contentType = 'image/png'

export default async function Image() {
  return buildOgImage(await loadCurrentData())
}
