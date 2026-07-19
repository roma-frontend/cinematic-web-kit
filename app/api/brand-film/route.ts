import { NextRequest, NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { generateBrandFilmScript } from '@/lib/brand-film';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { brief, dnaId, duration } = body as {
      brief?: string;
      dnaId?: string;
      duration?: number;
    };

    if (!brief || brief.trim().length === 0) {
      return NextResponse.json({ error: 'Brief is required' }, { status: 400 });
    }

    const scenes = generateBrandFilmScript(brief, dnaId, duration || 30);

    return NextResponse.json({
      success: true,
      scenes,
      totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0),
      sceneCount: scenes.length,
    });
  } catch (error) {
    console.error('Brand film generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate brand film script' },
      { status: 500 }
    );
  }
}
