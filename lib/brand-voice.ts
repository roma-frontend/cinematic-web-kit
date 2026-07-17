import 'server-only';

export interface BrandVoiceProfile {
  id: string;
  siteId: string;
  tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'playful' | 'authoritative';
  style: 'concise' | 'detailed' | 'storytelling' | 'technical' | 'emotional';
  audience: string;
  keywords: string[];
  examples: string[];
  createdAt: number;
  updatedAt: number;
}

export interface BrandVoiceAnalysis {
  tone: BrandVoiceProfile['tone'];
  style: BrandVoiceProfile['style'];
  audience: string;
  keywords: string[];
  confidence: number;
}

export function analyzeBrandVoice(texts: string[]): BrandVoiceAnalysis {
  const combined = texts.join(' ').toLowerCase();

  const toneIndicators = {
    formal: ['уважаемый', 'официальный', 'профессиональный', 'formal', 'professional', 'official'],
    casual: ['привет', 'дружеский', 'неформальный', 'casual', 'friendly', 'informal'],
    friendly: ['дружелюбный', 'тёплый', 'уютный', 'friendly', 'warm', 'cozy'],
    professional: ['эксперт', 'специалист', 'качество', 'expert', 'specialist', 'quality'],
    playful: ['весёлый', 'игривый', 'яркий', 'playful', 'fun', 'bright'],
    authoritative: ['лидер', 'лучший', 'номер один', 'leader', 'best', 'number one'],
  };

  const styleIndicators = {
    concise: ['коротко', 'быстро', 'сразу', 'concise', 'quick', 'brief'],
    detailed: ['подробно', 'детально', 'полный', 'detailed', 'comprehensive', 'full'],
    storytelling: ['история', 'рассказ', 'путешествие', 'story', 'journey', 'narrative'],
    technical: ['технический', 'спецификация', 'параметры', 'technical', 'specification', 'parameters'],
    emotional: ['чувства', 'эмоции', 'вдохновение', 'emotional', 'inspiration', 'feelings'],
  };

  const toneScores = Object.entries(toneIndicators).map(([tone, keywords]) => ({
    tone: tone as BrandVoiceProfile['tone'],
    score: keywords.filter(kw => combined.includes(kw)).length,
  }));

  const styleScores = Object.entries(styleIndicators).map(([style, keywords]) => ({
    style: style as BrandVoiceProfile['style'],
    score: keywords.filter(kw => combined.includes(kw)).length,
  }));

  const topTone = toneScores.sort((a, b) => b.score - a.score)[0];
  const topStyle = styleScores.sort((a, b) => b.score - a.score)[0];

  const words = combined.split(/\s+/).filter(w => w.length > 4);
  const wordFreq = new Map<string, number>();
  words.forEach(w => wordFreq.set(w, (wordFreq.get(w) || 0) + 1));
  const topKeywords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  const audiencePatterns = [
    /для\s+([а-яё]+)/gi,
    /for\s+([a-z]+)/gi,
    /клиент[ыов]/gi,
    /пользовател[ьи]/gi,
  ];

  let audience = '';
  for (const pattern of audiencePatterns) {
    const match = combined.match(pattern);
    if (match) {
      audience = match[0];
      break;
    }
  }

  const confidence = Math.min(100, (topTone.score + topStyle.score) * 10);

  return {
    tone: topTone.tone,
    style: topStyle.style,
    audience: audience || 'широкая аудитория',
    keywords: topKeywords,
    confidence,
  };
}

export function generateCopyWithVoice(
  prompt: string,
  voice: BrandVoiceProfile,
  locale: 'ru' | 'en' | 'hy'
): string {
  const toneMap = {
    formal: { ru: 'официальном', en: 'formal', hy: 'պաշտոնական' },
    casual: { ru: 'неформальном', en: 'casual', hy: 'ոչ պաշտոնական' },
    friendly: { ru: 'дружелюбном', en: 'friendly', hy: 'բարեկամական' },
    professional: { ru: 'профессиональном', en: 'professional', hy: 'մասնագիտական' },
    playful: { ru: 'игривом', en: 'playful', hy: 'խաղային' },
    authoritative: { ru: 'авторитетном', en: 'authoritative', hy: 'հեղինակավոր' },
  };

  const styleMap = {
    concise: { ru: 'кратко', en: 'concisely', hy: 'համառոտ' },
    detailed: { ru: 'подробно', en: 'in detail', hy: 'մանրամասն' },
    storytelling: { ru: 'в формате истории', en: 'as a story', hy: 'պատմության ձևով' },
    technical: { ru: 'технически', en: 'technically', hy: 'տեխնիկապես' },
    emotional: { ru: 'эмоционально', en: 'emotionally', hy: 'հուզական' },
  };

  const toneDesc = toneMap[voice.tone][locale];
  const styleDesc = styleMap[voice.style][locale];

  return `${prompt}\n\nWrite in a ${toneDesc} tone, ${styleDesc}. Target audience: ${voice.audience}. Include keywords: ${voice.keywords.slice(0, 5).join(', ')}.`;
}
