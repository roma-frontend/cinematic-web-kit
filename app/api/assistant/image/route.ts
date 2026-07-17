import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  try {
    const { prompt } = await request.json();
    
    if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
      return NextResponse.json(
        { error: 'Prompt must be a string between 1 and 500 characters' },
        { status: 400 }
      );
    }

    // Pollinations.ai free API - no key needed
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;

    return NextResponse.json({ imageUrl, prompt });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
