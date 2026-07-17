import { NextRequest, NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { analyzeImageColors, extractMoodFromImages } from '@/lib/mood-board';
import { getDnaFromMood } from '@/lib/cinematic-dna';

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  try {
    const formData = await req.formData();
    const images = formData.getAll('images') as File[];
    
    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    if (images.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 images allowed' }, { status: 400 });
    }

    const colorPalettes = await Promise.all(
      images.map(async (img) => {
        const buffer = Buffer.from(await img.arrayBuffer());
        return analyzeImageColors(buffer);
      })
    );

    const mood = extractMoodFromImages(colorPalettes);
    const recommendedDna = getDnaFromMood(mood);

    return NextResponse.json({
      success: true,
      mood,
      recommendedDna,
      colorPalettes,
      imageCount: images.length,
    });
  } catch (error) {
    console.error('Mood board analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze mood board' },
      { status: 500 }
    );
  }
}
