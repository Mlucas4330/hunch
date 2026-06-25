import { NextResponse } from 'next/server'

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params
  return NextResponse.json({ error: 'not_implemented' }, { status: 501 })
}
