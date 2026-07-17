# Cinematic DNA — Режиссёрские стили для сайтов

## Что это?

**Cinematic DNA** — это система режиссёрских стилей, которая пронизывает весь сайт единым визуальным языком. DNA задаёт **согласованный кинематографичный стиль** для всех AI-генерируемых видео, изображений и страниц.

## Что реально делает DNA?

### ✅ Работает сейчас:

1. **Генерация видео** (`/api/generate`, `scripts/media-pipeline/run.mjs`)
   - При генерации видео через AI-агент или CLI, prompt обогащается DNA-слоями:
   - `lens` (объектив), `lighting` (освещение), `colorGrade` (цветокоррекция), `motion` (движение камеры), `mood` (настроение), `filmStock` (плёнка)
   - **Пример:** "sweeping cinematic wide establishing shot of coffee shop, 27mm lens, flat perspective, perfectly centered symmetrical composition, flat even lighting, soft diffused daylight, pastel storybook palette, whimsical, precise, storybook charm, shot on 35mm, fine grain, vintage color reproduction, ultra-detailed, 8k, photorealistic..."

2. **Генерация изображений** (`/api/generate-image`)
   - При генерации изображений через Pollinations, prompt обогащается DNA-слоями
   - Изображения получают кинематографичный стиль (lens, lighting, colorGrade, filmStock, mood)

3. **Генерация страниц** (`/api/generate-page`)
   - При генерации страниц через LLM, system prompt включает DNA-контекст
   - LLM учитывает визуальный стиль при создании структуры страницы

4. **Builder AI-агент** (`/api/assistant/apply`)
   - AI-агент в builder получает `doc.dnaId` и учитывает его при классификации инструкций

5. **Cinematic Studio** (`app/studio/page.tsx`)
   - DNA selector доступен в Studio для генерации видео и изображений
   - DNA передаётся в `planFromBrief()` и `composePrompt()`

### ❌ Не делает:

- **Не меняет** уже существующие видео или изображения
- **Не меняет** визуальный вид сайта в preview (только будущую генерацию)
- **Не применяет** CSS-фильтры или эффекты к существующему контенту

## Как использовать?

### В Builder

1. Откройте builder (`/studio/builder`)
2. Во втором слое под toolbar найдите "🎬 Кинематографичный стиль:"
3. Выберите стиль из списка (Nolan, Anderson, Miyazaki и т.д.)
4. Появится зелёный бейдж "DNA активен"
5. Генерируйте видео/изображения/страницы через AI-агент — DNA применится автоматически

### В Cinematic Studio

1. Откройте Studio (`/studio`)
2. Перейдите в tab "Генерация" или "Изображения"
3. Найдите селектор "🎬 Кинематографичный стиль" рядом со стилем (Teal & Orange, A24 и т.д.)
4. Выберите DNA
5. Генерируйте видео или изображения — DNA применится автоматически

### Через CLI

```bash
npm run media -- \
  --prompt "Coffee shop with steam rising" \
  --section hero \
  --dna '{"label":"Wes Anderson","lens":"27mm lens, flat perspective, perfectly centered symmetrical composition","lighting":"flat even lighting, soft diffused daylight","colorGrade":"pastel storybook palette","filmStock":"shot on 35mm, fine grain","mood":"whimsical, precise","motion":"lateral tracking shots"}'
```

## 8 режиссёрских стилей

| Режиссёр | Стиль | Ключевые слова |
|----------|-------|----------------|
| **Christopher Nolan** | Эпический масштаб, IMAX, нелинейное время | время, масштаб, эпик, космос |
| **Denis Villeneuve** | Медитативный sci-fi, пустота, монументальность | пустыня, молчание, медитация |
| **Wes Anderson** | Идеальная симметрия, пастель, кукольная эстетика | симметрия, пастель, ретро |
| **Stanley Kubrick** | Одно-точечная перспектива, холодная точность | психология, контроль, точность |
| **Quentin Tarantino** | Ретро-шик, диалоги, насилие как искусство | ретро, 70-е, круто, дерзко |
| **Hayao Miyazaki** | Аниме-эстетика, природа, полёт, магия | природа, полёт, магия, детство |
| **David Fincher** | Тёмная элегантность, перфекционизм, цифровой нуар | тёмный, нуар, элегантно |
| **Wong Kar-wai** | Неоновый романтизм, время, память, одиночество | неон, ночь, романтика, меланхолия |

## Архитектура

### Файлы

- `lib/cinematic-dna.ts` — серверная версия (с `'server-only'`)
- `lib/cinematic-dna-client.ts` — клиентская версия (для UI)
- `components/builder/dna-selector.tsx` — UI-компонент для builder
- `app/api/dna/route.ts` — API endpoint для получения DNA
- `lib/prompt-composer.ts` — интеграция DNA в генерацию промптов (composePrompt, planFromBrief)

### Подключённые API

- `/api/generate` — принимает `dna` в GenerateBody, передаёт в `--dna` флаг CLI
- `/api/generate-image` — принимает `dna` в GenerateImageBody, передаёт в composeImagePrompt
- `/api/generate-page` — принимает `dnaId`, включает DNA-контекст в LLM system prompt
- `/api/assistant/apply` — принимает `dnaId` для контекста AI-агента
- `scripts/media-pipeline/run.mjs` — парсит `--dna` JSON, обогащает prompt перед generateVideo

### BuilderDoc

DNA сохраняется в `doc.dnaId`:

```typescript
interface BuilderDoc {
  brand: string;
  themeId: string;
  dnaId?: string; // Cinematic DNA
  // ...
}
```

## Почему это уникально?

Ни один конструктор сайтов (Wix, Tilda, Framer, Webflow) не предлагает:

1. **Режиссёрские стили** — язык кино, а не стоковые видео
2. **Согласованность** — все AI-генерируемые медиа на сайте выглядят как один фильм
3. **Автоматический подбор** — AI анализирует бриф и выбирает стиль
4. **Интеграция с темами** — DNA + тема = цельный визуальный код
5. **Полная интеграция** — DNA работает для видео, изображений и страниц

## Следующие шаги

- [ ] Scene Director — интерактивные сцены, реагирующие на скролл
- [ ] Cinematic Transitions — кинопереходы между секциями
- [ ] Cinematic Score — оценка кинематографичности сайта
- [ ] Cinematic A/B — тестирование разных DNA
