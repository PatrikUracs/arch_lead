import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

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

  for (const file of files) {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `submissions/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

    const bytes = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('room-photos')
      .upload(path, bytes, { contentType: file.type })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload photo. Please try again.' }, { status: 500 })
    }

    paths.push(path)
  }

  return NextResponse.json({ paths })
}
