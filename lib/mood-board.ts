import sharp from 'sharp';

export interface ColorPalette {
  dominant: string[];
  average: { r: number; g: number; b: number };
  brightness: number;
  saturation: number;
  warmth: number;
}

export interface MoodAnalysis {
  energy: 'low' | 'medium' | 'high';
  mood: 'calm' | 'balanced' | 'energetic' | 'dramatic';
  temperature: 'cool' | 'neutral' | 'warm';
  style: 'minimal' | 'modern' | 'vibrant' | 'luxury';
  confidence: number;
}

export async function analyzeImageColors(buffer: Buffer): Promise<ColorPalette> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(100, 100, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels: { r: number; g: number; b: number }[] = [];
    for (let i = 0; i < data.length; i += info.channels) {
      pixels.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
      });
    }

    const avgR = Math.round(pixels.reduce((sum, p) => sum + p.r, 0) / pixels.length);
    const avgG = Math.round(pixels.reduce((sum, p) => sum + p.g, 0) / pixels.length);
    const avgB = Math.round(pixels.reduce((sum, p) => sum + p.b, 0) / pixels.length);

    const brightness = (avgR + avgG + avgB) / (3 * 255);
    const max = Math.max(avgR, avgG, avgB);
    const min = Math.min(avgR, avgG, avgB);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const warmth = (avgR - avgB) / 255;

    const colorCounts = new Map<string, number>();
    pixels.forEach((p) => {
      const key = `${Math.round(p.r / 32) * 32},${Math.round(p.g / 32) * 32},${Math.round(p.b / 32) * 32}`;
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    });

    const dominant = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return rgbToHex(r, g, b);
      });

    return {
      dominant,
      average: { r: avgR, g: avgG, b: avgB },
      brightness,
      saturation,
      warmth,
    };
  } catch (error) {
    console.error('Color analysis error:', error);
    return {
      dominant: ['#808080'],
      average: { r: 128, g: 128, b: 128 },
      brightness: 0.5,
      saturation: 0,
      warmth: 0,
    };
  }
}

export function extractMoodFromImages(palettes: ColorPalette[]): MoodAnalysis {
  const avgBrightness = palettes.reduce((sum, p) => sum + p.brightness, 0) / palettes.length;
  const avgSaturation = palettes.reduce((sum, p) => sum + p.saturation, 0) / palettes.length;
  const avgWarmth = palettes.reduce((sum, p) => sum + p.warmth, 0) / palettes.length;

  let energy: 'low' | 'medium' | 'high' = 'medium';
  if (avgBrightness > 0.7 && avgSaturation > 0.5) energy = 'high';
  else if (avgBrightness < 0.3 || avgSaturation < 0.2) energy = 'low';

  let mood: 'calm' | 'balanced' | 'energetic' | 'dramatic' = 'balanced';
  if (energy === 'low' && avgSaturation < 0.3) mood = 'calm';
  else if (energy === 'high' && avgSaturation > 0.6) mood = 'energetic';
  else if (avgBrightness < 0.4 && avgSaturation > 0.4) mood = 'dramatic';

  let temperature: 'cool' | 'neutral' | 'warm' = 'neutral';
  if (avgWarmth > 0.15) temperature = 'warm';
  else if (avgWarmth < -0.15) temperature = 'cool';

  let style: 'minimal' | 'modern' | 'vibrant' | 'luxury' = 'modern';
  if (avgSaturation < 0.2 && avgBrightness > 0.7) style = 'minimal';
  else if (avgSaturation > 0.6 && energy === 'high') style = 'vibrant';
  else if (avgBrightness < 0.4 && avgSaturation < 0.4) style = 'luxury';

  const confidence = Math.min(0.95, 0.6 + palettes.length * 0.05);

  return {
    energy,
    mood,
    temperature,
    style,
    confidence,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
