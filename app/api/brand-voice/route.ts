import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { analyzeBrandVoice, type BrandVoiceAnalysis } from '@/lib/brand-voice';
import { getRawDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { siteId, texts } = body as { siteId?: string; texts?: string[] };

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: 'texts array is required' }, { status: 400 });
    }

    const analysis = analyzeBrandVoice(texts);

    const db = getRawDb();
    const now = Date.now();

    db.prepare(`
      INSERT INTO brand_voice (site_id, tone, style, audience, keywords, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(site_id) DO UPDATE SET
        tone = excluded.tone,
        style = excluded.style,
        audience = excluded.audience,
        keywords = excluded.keywords,
        confidence = excluded.confidence,
        updated_at = excluded.updated_at
    `).run(
      siteId,
      analysis.tone,
      analysis.style,
      analysis.audience,
      JSON.stringify(analysis.keywords),
      analysis.confidence,
      now,
      now
    );

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Brand voice analysis failed:', error);
    return NextResponse.json({ error: 'Failed to analyze brand voice' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId');

  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  }

  try {
    const db = getRawDb();
    const row = db.prepare('SELECT * FROM brand_voice WHERE site_id = ?').get(siteId) as any;

    if (!row) {
      return NextResponse.json({ voice: null });
    }

    return NextResponse.json({
      voice: {
        ...row,
        keywords: JSON.parse(row.keywords || '[]'),
      },
    });
  } catch (error) {
    console.error('Failed to fetch brand voice:', error);
    return NextResponse.json({ error: 'Failed to fetch brand voice' }, { status: 500 });
  }
}
