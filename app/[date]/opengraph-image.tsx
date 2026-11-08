import { notFound } from 'next/navigation'
import { buildOgImage, ogSize } from '../lib/og'
import { loadHistoryData } from '../data'

export const runtime = 'nodejs'
export const size = ogSize
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  const data = await loadHistoryData(date)
  if (!data) notFound()
  return buildOgImage(data)
}
