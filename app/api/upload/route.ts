import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

type MagicResult = { mime: string; ext: string } | null

function detectMagicBytes(buf: Uint8Array): MagicResult {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { mime: 'image/png', ext: 'png' }
  // WebP: "RIFF....WEBP"
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return { mime: 'image/webp', ext: 'webp' }
  return null
}

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const files = formData.getAll('photos') as File[]

  if (!files.length) {
    return NextResponse.json({ error: 'At least one photo is required.' }, { status: 400 })
  }
  if (files.length > 3) {
    return NextResponse.json({ error: 'Maximum 3 photos allowed.' }, { status: 400 })
  }

  // Read all buffers first so we can magic-check before touching storage
  const buffers: ArrayBuffer[] = []
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `"${file.name}" is not a supported format. Use JPEG, PNG, or WebP.` },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `"${file.name}" exceeds the 5 MB limit.` },
        { status: 400 }
      )
    }
    const buf = await file.arrayBuffer()
    const magic = detectMagicBytes(new Uint8Array(buf))
    if (!magic) {
      return NextResponse.json(
        { error: `"${file.name}" does not appear to be a valid image file.` },
        { status: 400 }
      )
    }
    if (magic.mime !== file.type) {
      return NextResponse.json(
        { error: `"${file.name}" file content does not match its declared type.` },
        { status: 400 }
      )
    }
    buffers.push(buf)
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase env vars not set')
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const paths: string[] = []

  for (let i = 0; i < files.length; i++) {
    const magic = detectMagicBytes(new Uint8Array(buffers[i]))!
    const path = `submissions/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${magic.ext}`

    const bytes = buffers[i]
    const { error: uploadError } = await supabase.storage
      .from('room-photos')
      .upload(path, bytes, { contentType: magic.mime })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload photo. Please try again.' }, { status: 500 })
    }

    paths.push(path)
  }

  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }
  const uploadToken = crypto
    .createHmac('sha256', secret)
    .update([...paths].sort().join(','))
    .digest('hex')

  return NextResponse.json({ paths, uploadToken })
}

