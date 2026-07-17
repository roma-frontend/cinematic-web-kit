import { NextRequest, NextResponse } from 'next/server';
import { DNA_PRESETS, getDna, pickDnaFromBrief } from '@/lib/cinematic-dna';
import { dnaConsistencyCheck } from '@/lib/cinematic-dna-client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const brief = searchParams.get('brief');
  const themeId = searchParams.get('themeId');

  if (id) {
    const dna = getDna(id);
    if (!dna) return NextResponse.json({ error: 'DNA not found' }, { status: 404 });
    const check = themeId ? dnaConsistencyCheck(dna, themeId) : null;
    return NextResponse.json({ dna, consistency: check });
  }

  if (brief) {
    const dna = pickDnaFromBrief(brief);
    const check = themeId ? dnaConsistencyCheck(dna, themeId) : null;
    return NextResponse.json({ dna, consistency: check });
  }

  return NextResponse.json({ presets: DNA_PRESETS });
}
