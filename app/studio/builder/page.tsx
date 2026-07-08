'use client';

import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowUp, ArrowDown, X, Plus, Save, Loader2, Monitor, Tablet, Smartphone,
  ExternalLink, Trash2, FileText, LayoutTemplate, ChevronRight, Copy, Upload, Wand2, Palette,
  Undo2, Redo2, LayoutGrid, ChevronDown, Maximize2, Minimize2, Sun, Moon, Rocket, Home,
  ClipboardPaste, CopyPlus, Keyboard, Eye, PanelLeft, RotateCw, Pipette, CornerLeftUp,
} from 'lucide-react';
import seed from '@/data/builder.json';
import { usePrefs, usePref, setPref } from '@/hooks/use-user-prefs';
import { useMounted } from '@/hooks/use-mounted';
import { THEMES, getTheme, themeCss } from '@/lib/themes';
import { RenderNode } from '@/components/builder/render-node';
import { TourLauncher } from '@/components/tour/tour-launcher';
import { RevealDisabled } from '@/components/builder/reveal';
import { Header as ChromeHeader, Footer as ChromeFooter } from '@/components/builder/site-chrome';
import { TEMPLATES, LANDINGS, SECTION_PRESETS, isPristineStarter, buildTemplatePage, buildSubpages, buildSection, tplText } from '@/lib/builder/templates';
import {
  type BuilderDoc, type BuilderNode, type NodeType, type BuilderPage,
  NODE_LABELS, isContainer, makeNode, newId,
} from '@/lib/builder/types';
import { updateProps, removeNode, insertChild, moveNode, findNode, duplicateNode, moveTo, insertAfter, ancestorTypes, ancestorPath, cloneWithNewIds, findSymbolOf, applySymbol, collectSymbols, findBySymbol } from '@/lib/builder/tree';
import { contrastRatio, wcagLevel } from '@/lib/contrast';
import { chromeBtnClass, CHROME_BTN_VARIANTS, CHROME_BTN_VARIANT_LABELS, CHROME_BTN_ROUNDED_LABELS, NAV_STYLES, NAV_STYLE_LABELS, THEME_BTN_PRESETS } from '@/lib/builder/chrome-buttons';
import { EFFECT_PRESETS, applyEffectPatch, clearEffectPatch, type EffectPreset } from '@/lib/builder/effects';
import { TutorialModal } from '@/components/builder/tutorial-modal';
import { useLocale } from '@/hooks/use-locale';
import { builderTr } from '@/lib/builder-dict';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/language-switcher';
import { studioDict } from '@/lib/studio-dict';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Field = { k: string; label: string; kind?: 'text' | 'textarea'; opts?: string[] };

const FIELDS: Record<NodeType, Field[]> = {
  section: [
    { k: 'padding', label: 'Отступы', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'minH', label: 'Мин. высота', opts: ['none', 'half', 'screen'] },
    { k: 'layout', label: 'Раскладка содержимого', opts: ['block', 'flex-row', 'flex-col', 'grid'] },
    { k: 'columns', label: 'Колонок (для grid)', opts: ['1', '2', '3', '4'] },
    { k: 'gap', label: 'Промежуток (flex/grid)', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'align', label: 'Выравнивание (align-items)', opts: ['—', 'start', 'center', 'end', 'stretch'] },
    { k: 'justify', label: 'Распределение (justify-content)', opts: ['—', 'start', 'center', 'end', 'between', 'around', 'evenly'] },
    { k: 'justifyItems', label: 'justify-items (grid)', opts: ['—', 'start', 'center', 'end', 'stretch'] },
    { k: 'colWidth', label: 'Ширина колонок (flex-row)', opts: ['equal', 'auto'] },
    { k: 'bg', label: 'Фон', opts: ['none', 'muted', 'card', 'primary', 'gradient'] },
    { k: 'fx', label: 'Спецэффект фона', opts: ['none', 'webgl', 'aurora', 'grid', 'dots'] },
    { k: 'width', label: 'Ширина', opts: ['narrow', 'normal', 'wide'] },
    { k: 'bgImage', label: 'Фоновая картинка (URL)' },
    { k: 'bgMode', label: 'Режим фона', opts: ['cover', 'blur', 'glass', 'overlay', 'tint', 'duotone'] },
    { k: 'bgVideo', label: 'Фоновое видео (URL .mp4)' },
    { k: 'parallax', label: 'Параллакс фона', opts: ['false', 'true'] },
  ],
  stack: [
    { k: 'gap', label: 'Промежуток', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'align', label: 'Выравнивание (align-items)', opts: ['start', 'center', 'end', 'stretch'] },
    { k: 'justify', label: 'Распределение (justify-content)', opts: ['start', 'center', 'end', 'between', 'around', 'evenly'] },
    { k: 'imgBg', label: 'Картинка как фон колонки', opts: ['off', 'cover', 'blur', 'glass', 'overlay', 'tint', 'duotone'] },
    { k: 'stagger', label: 'Появление по очереди', opts: ['false', 'true'] },
  ],
  row: [
    { k: 'gap', label: 'Промежуток', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'align', label: 'По верт. (align-items)', opts: ['start', 'center', 'end', 'stretch'] },
    { k: 'justify', label: 'По гориз. (justify-content)', opts: ['start', 'center', 'end', 'between', 'around', 'evenly'] },
    { k: 'wrap', label: 'Перенос', opts: ['wrap', 'nowrap'] },
    { k: 'stagger', label: 'Появление по очереди', opts: ['false', 'true'] },
  ],
  grid: [
    { k: 'columns', label: 'Колонок', opts: ['1', '2', '3', '4'] },
    { k: 'gap', label: 'Промежуток', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'align', label: 'Выравнивание (align-items)', opts: ['stretch', 'start', 'center', 'end'] },
    { k: 'justifyItems', label: 'Распределение (justify-items)', opts: ['stretch', 'start', 'center', 'end'] },
    { k: 'stagger', label: 'Появление по очереди', opts: ['false', 'true'] },
  ],
  card: [
    { k: 'cardVariant', label: 'Вариант', opts: ['elevated', 'outline', 'soft', 'glass', 'plain'] },
    { k: 'padding', label: 'Внутр. отступ', opts: ['none', 'sm', 'md', 'lg'] },
    { k: 'gap', label: 'Промежуток', opts: ['none', 'sm', 'md', 'lg'] },
  ],
  heading: [
    { k: 'text', label: 'Текст', kind: 'textarea' },
    { k: 'level', label: 'Уровень', opts: ['1', '2', '3', '4'] },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center', 'right'] },
    { k: 'gradient', label: 'Градиентный текст', opts: ['false', 'true'] },
  ],
  text: [
    { k: 'text', label: 'Текст', kind: 'textarea' },
    { k: 'size', label: 'Размер', opts: ['sm', 'base', 'lg'] },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center', 'right'] },
    { k: 'muted', label: 'Приглушить', opts: ['true', 'false'] },
    { k: 'gradient', label: 'Градиентный текст', opts: ['false', 'true'] },
  ],
  list: [
    { k: 'items', label: 'Пункты (по строкам)', kind: 'textarea' },
    { k: 'listVariant', label: 'Вариант', opts: ['bullet', 'check', 'arrow', 'numbered', 'plain'] },
  ],
  counter: [
    { k: 'value', label: 'Значение (напр. 10000+, 99.9%)' },
    { k: 'label', label: 'Подпись' },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center', 'right'] },
  ],
  button: [
    { k: 'text', label: 'Текст' },
    { k: 'type', label: 'Тип', opts: ['link', 'submit', 'reset'] },
    { k: 'href', label: 'Ссылка (для типа link)' },
    { k: 'variant', label: 'Стиль', opts: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] },
    { k: 'size', label: 'Размер', opts: ['sm', 'default', 'lg'] },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center', 'right'] },
    { k: 'shimmer', label: 'Блик (shimmer)', opts: ['false', 'true'] },
  ],
  image: [
    { k: 'src', label: 'URL картинки (светлая тема)' },
    { k: 'srcDark', label: 'URL картинки (тёмная тема)' },
    { k: 'alt', label: 'Alt-текст' },
    { k: 'rounded', label: 'Скругление', opts: ['none', 'lg', 'full'] },
    { k: 'ratio', label: 'Пропорции (напр. 16/9)' },
  ],
  landingHero: [
    { k: 'badge', label: 'Бейдж' },
    { k: 'title', label: 'Заголовок', kind: 'textarea' },
    { k: 'subtitle', label: 'Подзаголовок', kind: 'textarea' },
    { k: 'ctaPrimaryLabel', label: 'Кнопка 1 — текст' },
    { k: 'ctaPrimaryHref', label: 'Кнопка 1 — ссылка' },
    { k: 'ctaSecondaryLabel', label: 'Кнопка 2 — текст' },
    { k: 'ctaSecondaryHref', label: 'Кнопка 2 — ссылка' },
    { k: 'microcopy', label: 'Микротекст (пункты через ·)' },
    { k: 'previewUrl', label: 'Макет браузера: адрес' },
    { k: 'previewPublish', label: 'Макет браузера: бейдж «опубликовано»' },
  ],
  video: [
    { k: 'src', label: 'URL (YouTube/Vimeo/MP4)' },
    { k: 'ratio', label: 'Пропорции (напр. 16/9)' },
    { k: 'rounded', label: 'Скругление', opts: ['none', 'lg'] },
  ],
  input: [
    { k: 'name', label: 'Имя поля' },
    { k: 'label', label: 'Метка' },
    { k: 'placeholder', label: 'Подсказка' },
    { k: 'type', label: 'Тип', opts: ['text', 'email', 'tel', 'number', 'password', 'url', 'search', 'date', 'time'] },
    { k: 'required', label: 'Обязательное', opts: ['false', 'true'] },
  ],
  textarea: [
    { k: 'name', label: 'Имя поля' },
    { k: 'label', label: 'Метка' },
    { k: 'placeholder', label: 'Подсказка' },
    { k: 'required', label: 'Обязательное', opts: ['false', 'true'] },
  ],
  form: [
    { k: 'formId', label: 'ID формы' },
    { k: 'submitText', label: 'Текст кнопки' },
    { k: 'successMsg', label: 'Сообщение об успехе' },
    { k: 'webhook', label: 'Webhook URL (POST при отправке)' },
    { k: 'notifyEmail', label: 'E-mail для уведомлений' },
    { k: 'redirect', label: 'Редирект после отправки (URL)' },
    { k: 'honeypot', label: 'Антиспам (honeypot)', opts: ['on', 'off'] },
  ],
  pricing: [
    { k: 'priceVariant', label: 'Вариант', opts: ['card', 'outline', 'minimal'] },
    { k: 'plan', label: 'Название плана' },
    { k: 'price', label: 'Цена' },
    { k: 'period', label: 'Период (напр. /мес)' },
    { k: 'features', label: 'Фичи (по строкам)', kind: 'textarea' },
    { k: 'cta', label: 'Текст кнопки' },
    { k: 'href', label: 'Ссылка кнопки' },
    { k: 'featured', label: 'Выделить', opts: ['false', 'true'] },
  ],
  testimonial: [
    { k: 'quoteVariant', label: 'Вариант', opts: ['card', 'quote', 'minimal', 'centered'] },
    { k: 'quote', label: 'Цитата', kind: 'textarea' },
    { k: 'author', label: 'Автор' },
    { k: 'role', label: 'Должность / компания' },
  ],
  socials: [
    { k: 'socialVariant', label: 'Вариант', opts: ['pills', 'buttons', 'underline', 'minimal'] },
    { k: 'links', label: 'Ссылки «Текст|URL» (по строкам)', kind: 'textarea' },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center', 'right'] },
  ],
  faq: [
    { k: 'faqVariant', label: 'Вариант', opts: ['bordered', 'separated', 'card', 'plain'] },
    { k: 'items', label: 'Вопрос::Ответ (по строкам)', kind: 'textarea' },
    { k: 'align', label: 'Выравнивание', opts: ['left', 'center'] },
  ],
  tabs: [{ k: 'items', label: 'Вкладка::Содержимое (по строкам)', kind: 'textarea' }],
  divider: [],
  spacer: [{ k: 'height', label: 'Высота', opts: ['sm', 'md', 'lg'] }],
  themeGallery: [
    { k: 'count', label: 'Сколько тем' },
    { k: 'columns', label: 'Колонок', opts: ['2', '3', '4'] },
  ],
  videoGrid: [
    { k: 'count', label: 'Сколько роликов (из Студии, когда список пуст)' },
  ],
  authLogin: [
    { k: 'title', label: 'Заголовок' },
    { k: 'submitText', label: 'Текст кнопки' },
    { k: 'successMsg', label: 'Сообщение после входа' },
  ],
  authRegister: [
    { k: 'title', label: 'Заголовок' },
    { k: 'submitText', label: 'Текст кнопки' },
    { k: 'successMsg', label: 'Сообщение после регистрации' },
    { k: 'showName', label: 'Поле «Имя»', opts: ['true', 'false'] },
  ],
  authAccount: [
    { k: 'title', label: 'Заголовок' },
    { k: 'logoutText', label: 'Текст кнопки выхода' },
  ],
  courseList: [
    { k: 'title', label: 'Заголовок' },
    { k: 'columns', label: 'Колонок', opts: ['1', '2', '3', '4'] },
    { k: 'showProgress', label: 'Показывать прогресс', opts: ['true', 'false'] },
  ],
  documentList: [
    { k: 'title', label: 'Заголовок' },
    { k: 'columns', label: 'Колонок', opts: ['1', '2', '3', '4'] },
  ],
  materialList: [
    { k: 'title', label: 'Заголовок' },
    { k: 'columns', label: 'Колонок', opts: ['1', '2', '3', '4'] },
  ],
};

const PALETTE: NodeType[] = ['section', 'stack', 'row', 'grid', 'card', 'heading', 'text', 'list', 'counter', 'button', 'image', 'video', 'input', 'textarea', 'form', 'pricing', 'testimonial', 'socials', 'faq', 'tabs', 'divider', 'spacer', 'themeGallery', 'videoGrid', 'landingHero', 'authLogin', 'authRegister', 'authAccount', 'courseList', 'documentList', 'materialList'];

// videoGrid manual items: one "URL::Title::Caption::Poster" line per card.
type GridItem = { src: string; title: string; subtitle: string; poster: string; srcDark: string; posterDark: string };
const parseGridItems = (items?: string): GridItem[] =>
  (items ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [src = '', title = '', subtitle = '', poster = '', srcDark = '', posterDark = ''] = l.split('::').map((s) => s.trim());
      return { src, title, subtitle, poster, srcDark, posterDark };
    });
const serializeGridItems = (rows: GridItem[]): string =>
  rows
    // An all-empty row (just added via "+") is kept as '::' so it survives the
    // round-trip until the user types a URL; render-node skips src-less lines.
    // Trailing empty fields (poster / dark variants) are trimmed off.
    .map((r) => [r.src, r.title, r.subtitle, r.poster, r.srcDark, r.posterDark].join('::').replace(/(::)+$/, '') || '::')
    .join('\n');
const GRID_IMG_RE = /\.(webp|jpe?g|png|gif|avif|svg)(\?.*)?$/i;

// Styling controls available for EVERY element, grouped for quick access.
const STYLE_GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: 'Типографика',
    fields: [
      { k: 'fontSize', label: 'Размер шрифта', opts: ['—', 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] },
      { k: 'fontWeight', label: 'Насыщенность', opts: ['—', 'normal', 'medium', 'semibold', 'bold'] },
      { k: 'letterSpacing', label: 'Межбуквенный', opts: ['—', 'normal', 'wide', 'wider'] },
      { k: 'lineHeight', label: 'Межстрочный', opts: ['—', 'tight', 'normal', 'relaxed', 'loose'] },
      { k: 'textColor', label: 'Цвет текста', opts: ['—', 'primary', 'foreground', 'muted', 'white'] },
    ],
  },
  {
    title: 'Фон и границы',
    fields: [
      { k: 'bgColor', label: 'Фон', opts: ['—', 'transparent', 'primary', 'muted', 'card', 'foreground', 'white', 'black'] },
      { k: 'borderWidth', label: 'Толщина рамки', opts: ['—', '0', '1', '2', '4'] },
      { k: 'borderColor', label: 'Цвет рамки', opts: ['—', 'border', 'primary', 'muted', 'foreground', 'white'] },
      { k: 'radius', label: 'Скругление', opts: ['—', 'none', 'sm', 'lg', 'xl', 'full'] },
      { k: 'ring', label: 'Ring (фокус)', opts: ['—', 'none', 'primary', 'subtle', 'offset'] },
      { k: 'shadow', label: 'Тень', opts: ['—', 'none', 'sm', 'md', 'lg', 'xl'] },
      { k: 'opacity', label: 'Прозрачность', opts: ['—', '100', '90', '75', '50'] },
    ],
  },
  {
    title: 'Размещение (внутри колонки / ряда / сетки)',
    fields: [
      { k: 'alignSelf', label: 'align-self', opts: ['—', 'auto', 'start', 'center', 'end', 'stretch'] },
      { k: 'justifySelf', label: 'justify-self (в сетке)', opts: ['—', 'auto', 'start', 'center', 'end', 'stretch'] },
      { k: 'grow', label: 'Растяжение (flex)', opts: ['—', 'none', 'grow', 'shrink'] },
      { k: 'width', label: 'Ширина', opts: ['—', 'auto', 'full', 'fit'] },
    ],
  },
  {
    title: 'Отступы',
    fields: [
      { k: 'mt', label: 'Отступ сверху', opts: ['—', 'none', 'sm', 'md', 'lg'] },
      { k: 'mb', label: 'Отступ снизу', opts: ['—', 'none', 'sm', 'md', 'lg'] },
    ],
  },
  {
    title: 'Адаптив (на каких экранах показывать)',
    fields: [
      { k: 'showOn', label: 'Показывать на', opts: ['—', 'all', 'mobile', 'tablet', 'desktop'] },
    ],
  },
  {
    title: 'Анимация и наведение',
    fields: [
      { k: 'animate', label: 'Анимация появления', opts: ['—', 'none', 'fade', 'slide-up', 'slide-left', 'slide-right', 'zoom', 'mask'] },
      { k: 'loop', label: 'Постоянная анимация', opts: ['—', 'none', 'pulse', 'float', 'bounce'] },
      { k: 'hover', label: 'Движение при наведении', opts: ['—', 'none', 'lift', 'grow', 'glow', 'bright', 'pulse'] },
      { k: 'hoverBg', label: 'Фон при наведении', opts: ['—', 'none', 'primary', 'muted', 'foreground', 'dark'] },
      { k: 'hoverText', label: 'Цвет текста при наведении', opts: ['—', 'none', 'primary', 'foreground', 'muted'] },
    ],
  },
  {
    title: 'Размеры (свои значения CSS)',
    fields: [
      { k: 'cssWidth', label: 'Ширина (напр. 320px / 60%)', kind: 'text' },
      { k: 'cssHeight', label: 'Высота (напр. 240px / 40vh)', kind: 'text' },
      { k: 'cssMaxW', label: 'Макс. ширина', kind: 'text' },
      { k: 'cssMinW', label: 'Мин. ширина', kind: 'text' },
      { k: 'cssMaxH', label: 'Макс. высота', kind: 'text' },
      { k: 'cssMinH', label: 'Мин. высота', kind: 'text' },
      { k: 'cssAspect', label: 'Соотношение (напр. 16/9)', kind: 'text' },
    ],
  },
  {
    title: 'Отступы (свои значения CSS)',
    fields: [
      { k: 'cssPadding', label: 'padding (напр. 16px 24px)', kind: 'text' },
      { k: 'cssMargin', label: 'margin (напр. 0 auto)', kind: 'text' },
      { k: 'cssGap', label: 'gap (в колонке/ряду/сетке)', kind: 'text' },
    ],
  },
  {
    title: 'Трансформации и фильтры',
    fields: [
      { k: 'cssTransform', label: 'transform (rotate/scale/translate/skew)', kind: 'text' },
      { k: 'cssTransformOrigin', label: 'Точка трансформации', opts: ['—', 'center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'] },
      { k: 'cssFilter', label: 'filter (blur/brightness/…)', kind: 'text' },
      { k: 'cssBackdrop', label: 'backdrop-filter (напр. blur(8px))', kind: 'text' },
      { k: 'cssMixBlend', label: 'Смешивание (mix-blend-mode)', opts: ['—', 'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'difference', 'exclusion', 'hue', 'luminosity'] },
      { k: 'cssTransition', label: 'transition (напр. all .3s ease)', kind: 'text' },
    ],
  },
  {
    title: 'Тени, фон, текст (свои значения CSS)',
    fields: [
      { k: 'cssShadow', label: 'box-shadow (напр. 0 10px 30px #0003)', kind: 'text' },
      { k: 'cssTextShadow', label: 'text-shadow', kind: 'text' },
      { k: 'cssGradient', label: 'Градиент-фон (linear-gradient(…))', kind: 'text' },
      { k: 'cssBgImage', label: 'Фон-картинка (URL)', kind: 'text' },
      { k: 'cssBgSize', label: 'Размер фона', opts: ['—', 'cover', 'contain', 'auto', '100% 100%'] },
      { k: 'cssBgPosition', label: 'Позиция фона (напр. center)', kind: 'text' },
      { k: 'cssTextAlign', label: 'Выравнивание текста', opts: ['—', 'left', 'center', 'right', 'justify'] },
      { k: 'cssTextTransform', label: 'Регистр', opts: ['—', 'none', 'uppercase', 'lowercase', 'capitalize'] },
      { k: 'cssTextDecoration', label: 'Оформление текста', opts: ['—', 'none', 'underline', 'line-through', 'overline'] },
      { k: 'cssFontStyle', label: 'Начертание', opts: ['—', 'normal', 'italic'] },
      { k: 'cssFontFamily', label: 'Шрифт (font-family)', kind: 'text' },
      { k: 'cssWhiteSpace', label: 'Перенос (white-space)', opts: ['—', 'normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line'] },
    ],
  },
  {
    title: 'Позиционирование и слои',
    fields: [
      { k: 'cssPosition', label: 'position', opts: ['—', 'static', 'relative', 'absolute', 'fixed', 'sticky'] },
      { k: 'cssZ', label: 'z-index', kind: 'text' },
      { k: 'cssOverflow', label: 'overflow', opts: ['—', 'visible', 'hidden', 'auto', 'scroll', 'clip'] },
      { k: 'cssCursor', label: 'Курсор', opts: ['—', 'auto', 'pointer', 'default', 'not-allowed', 'grab', 'zoom-in', 'help', 'text'] },
      { k: 'cssTop', label: 'top', kind: 'text' },
      { k: 'cssRight', label: 'right', kind: 'text' },
      { k: 'cssBottom', label: 'bottom', kind: 'text' },
      { k: 'cssLeft', label: 'left', kind: 'text' },
    ],
  },
  {
    title: 'CSS-анимация',
    fields: [
      { k: 'animName', label: 'Анимация', opts: ['—', 'none', 'fadein', 'fadeup', 'fadedown', 'fadeleft', 'faderight', 'zoomin', 'zoomout', 'spin', 'pulse', 'float', 'bounce', 'shake', 'swing', 'wobble', 'heartbeat', 'blink', 'glow', 'jelly', 'gradient-shift', 'custom'] },
      { k: 'animDuration', label: 'Длительность (напр. 1s / 800ms)', kind: 'text' },
      { k: 'animTiming', label: 'Кривая', opts: ['—', 'ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring', 'smooth'] },
      { k: 'animDelay', label: 'Задержка (напр. .2s)', kind: 'text' },
      { k: 'animIter', label: 'Повторы', opts: ['—', '1', '2', '3', 'infinite'] },
      { k: 'animDirection', label: 'Направление', opts: ['—', 'normal', 'reverse', 'alternate', 'alternate-reverse'] },
      { k: 'animFill', label: 'Заполнение (fill-mode)', opts: ['—', 'both', 'forwards', 'backwards', 'none'] },
      { k: 'animKeyframes', label: 'Свои @keyframes (для «custom»), напр. 0%{…}100%{…}', kind: 'textarea' },
    ],
  },
  {
    title: 'Наведение — свои стили (hover)',
    fields: [
      { k: 'hvBg', label: 'Фон', opts: ['—', 'primary', 'muted', 'card', 'foreground', 'white', 'black'] },
      { k: 'hvText', label: 'Цвет текста', opts: ['—', 'primary', 'foreground', 'muted', 'white'] },
      { k: 'hvBorderColor', label: 'Цвет рамки', opts: ['—', 'border', 'primary', 'muted', 'foreground', 'white'] },
      { k: 'hvRadius', label: 'Скругление', opts: ['—', 'none', 'sm', 'lg', 'xl', 'full'] },
      { k: 'hvShadow', label: 'Тень (box-shadow)', kind: 'text' },
      { k: 'hvScale', label: 'Масштаб (напр. 1.05)', kind: 'text' },
      { k: 'hvRotate', label: 'Поворот (напр. 3deg)', kind: 'text' },
      { k: 'hvTranslateY', label: 'Сдвиг по Y (напр. -6px)', kind: 'text' },
      { k: 'hvOpacity', label: 'Прозрачность (0–1)', kind: 'text' },
      { k: 'hvFilter', label: 'filter', kind: 'text' },
      { k: 'hvTransform', label: 'Свой transform', kind: 'text' },
      { k: 'hvCss', label: 'Свои CSS-объявления при наведении', kind: 'textarea' },
    ],
  },
  {
    title: 'Свой CSS (полный контроль)',
    fields: [
      { k: 'customCss', label: 'CSS-объявления для элемента (напр. color:red; gap:8px)', kind: 'textarea' },
      { k: 'customCssFull', label: 'Полный CSS, где & = этот элемент (можно @media, @keyframes, вложенные селекторы)', kind: 'textarea' },
    ],
  },
];
const DEVICE = { full: '100%', tablet: '834px', mobile: '390px' } as const;
// Scoped stylesheet powering the little animated preview tile inside each effect
// button. Entrance/hover effects play on button hover (.fxgrp:hover), loop
// effects run continuously, style effects show a static look. Mirrors the real
// engine so the tile faithfully hints at what the effect does.
const FX_PREVIEW_CSS = `
.fxp{display:block;width:70%;height:14px;border-radius:4px;background:linear-gradient(135deg,var(--primary),#8b5cf6)}
.fxgrp:hover .fxp-fade-up{animation:fxk-fadeup .7s cubic-bezier(.4,0,.2,1) both}
.fxgrp:hover .fxp-fade-in{animation:fxk-fadein .8s ease-out both}
.fxgrp:hover .fxp-zoom-in{animation:fxk-zoomin .6s cubic-bezier(.34,1.56,.64,1) both}
.fxgrp:hover .fxp-reveal-right{animation:fxk-faderight .7s cubic-bezier(.4,0,.2,1) both}
.fxgrp:hover .fxp-reveal-left{animation:fxk-fadeleft .7s cubic-bezier(.4,0,.2,1) both}
.fxp-float{animation:fxk-float 3s ease-in-out infinite}
.fxp-pulse{animation:fxk-pulse 2s ease-in-out infinite}
.fxp-spin{width:14px;animation:fxk-spin 6s linear infinite}
.fxp-heartbeat{animation:fxk-heartbeat 1.5s ease-in-out infinite}
.fxp-blink{animation:fxk-blink 1.4s ease-in-out infinite}
.fxp-lift,.fxp-grow,.fxp-neon,.fxp-tilt,.fxp-brighten{transition:all .25s ease}
.fxgrp:hover .fxp-lift{transform:translateY(-4px);box-shadow:0 8px 18px rgba(0,0,0,.35)}
.fxgrp:hover .fxp-grow{transform:scale(1.14)}
.fxgrp:hover .fxp-neon{box-shadow:0 0 10px var(--primary),0 0 22px var(--primary)}
.fxgrp:hover .fxp-tilt{transform:perspective(300px) rotateX(12deg) rotateY(-14deg)}
.fxgrp:hover .fxp-brighten{filter:brightness(1.25) saturate(1.25)}
.fxp-glass{background:linear-gradient(135deg,rgba(255,255,255,.28),rgba(255,255,255,.06));border:1px solid rgba(255,255,255,.45)}
.fxp-gradient-text{background:linear-gradient(90deg,var(--primary),#8b5cf6,#ec4899)}
.fxp-gradient-animated{background:linear-gradient(270deg,var(--primary),#8b5cf6,#ec4899,var(--primary));background-size:400% 400%;animation:fxk-gradient 6s linear infinite}
.fxp-soft-shadow{box-shadow:0 10px 22px -8px rgba(0,0,0,.55)}
@keyframes fxk-fadeup{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:none}}
@keyframes fxk-fadein{0%{opacity:0}100%{opacity:1}}
@keyframes fxk-zoomin{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}
@keyframes fxk-faderight{0%{opacity:0;transform:translateX(-16px)}100%{opacity:1;transform:none}}
@keyframes fxk-fadeleft{0%{opacity:0;transform:translateX(16px)}100%{opacity:1;transform:none}}
@keyframes fxk-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes fxk-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
@keyframes fxk-spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
@keyframes fxk-heartbeat{0%,100%{transform:scale(1)}14%{transform:scale(1.22)}28%{transform:scale(1)}42%{transform:scale(1.16)}70%{transform:scale(1)}}
@keyframes fxk-blink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes fxk-gradient{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
`;
// Preview pane width bounds: never wider than 1100px and always leaves the
// editor panel at least ~360px, so neither side can be crushed off-screen.
const clampPreviewWidth = (w: number) =>
  Math.max(300, Math.min(1100, w, typeof window !== 'undefined' ? window.innerWidth - 360 : 1100));
// All style keys (from STYLE_GROUPS) + their per-breakpoint variants — used to
// capture/apply reusable style presets.
const STYLE_PRESET_BASE_KEYS = STYLE_GROUPS.flatMap((g) => g.fields.map((f) => f.k));
function collectStyleProps(props: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of STYLE_PRESET_BASE_KEYS) {
    for (const suf of ['', 'Tablet', 'Desktop']) {
      const v = props[k + suf];
      if (v) out[k + suf] = v;
    }
  }
  return out;
}
// Image display-mode editing is bound to the selected device. Each device edits
// its own breakpoint prop; tablet/desktop inherit the smaller size when unset.
const IMG_MODE_OPTS = ['inline', 'cover', 'background', 'glow', 'overlay', 'duotone', 'framed'] as const;
const IMG_MODE_KEY = { mobile: 'imgMode', tablet: 'imgModeTablet', full: 'imgModeDesktop' } as const;
const IMG_DEVICE_LABEL = { mobile: 'моб.', tablet: 'планшет', full: 'десктоп' } as const;
// The mode actually in effect for a device, applying inheritance.
function effectiveImgMode(props: Record<string, string>, dev: keyof typeof DEVICE): string {
  const base = props.imgMode || 'inline';
  const tablet = props.imgModeTablet && props.imgModeTablet !== '—' ? props.imgModeTablet : base;
  const desktop = props.imgModeDesktop && props.imgModeDesktop !== '—' ? props.imgModeDesktop : tablet;
  return dev === 'mobile' ? base : dev === 'tablet' ? tablet : desktop;
}

// Generic per-breakpoint styling for surface props. Base key = mobile (applies
// everywhere); `<key>Tablet` overrides at >=768px, `<key>Desktop` at >=1024px.
// Switching the device selector scopes edits to that breakpoint.
const RESP_KEYS = new Set(['textColor', 'fontWeight', 'fontSize', 'letterSpacing', 'lineHeight', 'opacity', 'bgColor', 'borderWidth', 'borderColor', 'radius', 'shadow', 'mt', 'mb', 'alignSelf', 'justifySelf', 'grow', 'width',
  'cssWidth', 'cssHeight', 'cssMaxW', 'cssMinW', 'cssMaxH', 'cssMinH', 'cssAspect',
  'cssPadding', 'cssMargin', 'cssGap',
  'cssShadow', 'cssGradient', 'cssBgImage', 'cssBgSize', 'cssBgPosition',
  'cssTransform', 'cssTransformOrigin', 'cssFilter', 'cssBackdrop', 'cssMixBlend', 'cssTransition',
  'cssTextAlign', 'cssTextTransform', 'cssTextDecoration', 'cssFontStyle', 'cssFontFamily', 'cssTextShadow', 'cssWhiteSpace',
  'cssCursor', 'cssOverflow', 'cssZ', 'cssPosition', 'cssTop', 'cssLeft', 'cssRight', 'cssBottom']);
const BP_SUFFIX = { mobile: '', tablet: 'Tablet', full: 'Desktop' } as const;
// Per-type layout FIELDS that should also be scoped per breakpoint.
const RESP_FIELD_KEYS = new Set(['layout', 'gap', 'align', 'justify', 'justifyItems', 'columns', 'imgBg']);
// All keys that support per-breakpoint overrides (for reset / copy across screens).
const ALL_RESP_KEYS = [...new Set([...RESP_KEYS, ...RESP_FIELD_KEYS])];
const respKey = (k: string, dev: keyof typeof DEVICE) => k + BP_SUFFIX[dev];
function respValue(props: Record<string, string>, k: string, dev: keyof typeof DEVICE): string | undefined {
  const base = props[k];
  const tablet = props[k + 'Tablet'] && props[k + 'Tablet'] !== '—' ? props[k + 'Tablet'] : base;
  const desktop = props[k + 'Desktop'] && props[k + 'Desktop'] !== '—' ? props[k + 'Desktop'] : tablet;
  return dev === 'mobile' ? base : dev === 'tablet' ? tablet : desktop;
}

// Native color pickers fire an input event for every pixel the pointer moves
// across the palette; committing each shade into the doc re-renders the whole
// builder + preview and freezes the UI. Keep the dragged value local and push
// it to the doc only once the pointer settles (or the input loses focus).
function ColorInput({ value, onCommit, onPreview, title, className }: { value: string; onCommit: (v: string) => void; onPreview?: (v: string) => void; title?: string; className?: string }) {
  const [local, setLocal] = useState(value);
  // Adopt outside value changes (undo, preset, select) during render — the
  // sanctioned alternative to a setState-in-effect sync.
  const [adopted, setAdopted] = useState(value);
  if (adopted !== value) { setAdopted(value); setLocal(value); }
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef(onCommit);
  const previewRef = useRef(onPreview);
  useEffect(() => { commitRef.current = onCommit; previewRef.current = onPreview; });
  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (pending.current !== null) { commitRef.current(pending.current); pending.current = null; }
  }, []);
  useEffect(() => flush, [flush]); // don't drop the last picked shade on unmount
  return (
    <input
      type="color"
      value={local}
      title={title}
      className={className}
      onChange={(e) => {
        const v = e.target.value;
        setLocal(v);
        pending.current = v;
        previewRef.current?.(v); // live hint only — the doc is untouched until flush
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, 200);
      }}
      onBlur={flush}
    />
  );
}

// useSearchParams requires a Suspense boundary at the page level.
export default function BuilderEditorPage() {
  return (
    <Suspense>
      <BuilderEditor />
    </Suspense>
  );

}
interface SiteMeta {
  id: string;
  name: string;
  slug: string;
  published: boolean;
}

function BuilderEditor() {
  const router = useRouter();
  const locale = useLocale().locale;
  const tr = builderTr(locale);
  const t = studioDict(locale);
  const { confirm, confirmDialog } = useConfirm();
  const siteId = useSearchParams().get('site');
  const [siteMeta, setSiteMeta] = useState<SiteMeta | null>(null);
  const [doc, setDoc] = useState<BuilderDoc>(seed as unknown as BuilderDoc);
  const [pageId, setPageId] = useState<string>((seed as unknown as BuilderDoc).pages[0]?.id ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<keyof typeof DEVICE>('full');
  const [tab, setTab] = useState<'pages' | 'blocks' | 'design'>('pages');
  const [previewWidth, setPreviewWidth] = useState(520);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewDark, setPreviewDark] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [treeQuery, setTreeQuery] = useState('');
  // Clipboard for copy/paste of an element's style props (feature 4).
  const [copiedStyle, setCopiedStyle] = useState<Record<string, string> | null>(null);
  // Entitlement gate: advanced builder capabilities (effects, animation, custom
  // CSS, per-breakpoint styling, copy/paste) are Studio-plan-only. Optimistic
  // default keeps paying users flash-free; a non-entitled account is locked once
  // the snapshot loads. Superadmins are always unlimited.
  const [builderUnlocked, setBuilderUnlocked] = useState(true);
  useEffect(() => {
    let alive = true;
    fetch('/api/billing/entitlements')
      .then((r) => r.json())
      .then((e: { unlimited?: boolean; features?: string[] }) => {
        if (!alive) return;
        const unlocked = !!e.unlimited || (e.features ?? []).includes('builder.customCss');
        setBuilderUnlocked(unlocked);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const [selRect, setSelRect] = useState<{ top: number; left: number; width: number; height: number; vw: number; vh: number } | null>(null);
  const [selColors, setSelColors] = useState<{ color: string; bg: string; hasText: boolean } | null>(null);
  // Stable indirection so the preview message listener can commit inline text
  // edits via `patch` (defined later) without re-subscribing every render.
  const editTextRef = useRef<(id: string, prop: string, value: string) => void>(() => {});
  const [dropHint, setDropHint] = useState<{ id: string; pos: 'before' | 'after' } | null>(null);
  // Below lg the editor panel and the preview don't fit side by side — the
  // toolbar toggle shows one of them full-width instead.
  const [mobileView, setMobileView] = useState<'panel' | 'preview'>('panel');
  const toggleCollapse = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  // Splitter drag: pointer events (mouse + touch + pen), one state write per
  // frame (rAF), and the iframe ignores the pointer while dragging — otherwise
  // it swallows move events and the resize stutters or gets stuck.
  const [isResizing, setIsResizing] = useState(false);
  const startResize = (e: ReactPointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
    let raf = 0;
    let lastX = e.clientX;
    const onMove = (ev: PointerEvent) => {
      lastX = ev.clientX;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setPreviewWidth(clampPreviewWidth(window.innerWidth - lastX));
      });
    };
    const onUp = () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setIsResizing(false);
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };
  // Keep the preview pane within bounds when the window shrinks.
  useEffect(() => {
    const clamp = () => setPreviewWidth((w) => clampPreviewWidth(w));
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);
  const [previewKey, setPreviewKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Mirror `dirty` into a ref so unmount/unload flush handlers see the latest.
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  const [msg, setMsg] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newPath, setNewPath] = useState('');

  // ---- editor chrome persistence (per user, per site: user_prefs) ----
  // Open page, panel tab, preview device/width/scheme and collapsed tree groups
  // survive a reload and follow the account. Applied once when both the prefs
  // snapshot and the site doc have arrived; saved (debounced) on every change.
  const prefs = usePrefs();
  const chromeApplied = useRef(false);
  useEffect(() => {
    if (chromeApplied.current || !prefs || !siteMeta || !siteId) return;
    chromeApplied.current = true;
    const c = prefs[`builder:${siteId}`] as Record<string, unknown> | undefined;
    if (!c || typeof c !== 'object') return;
    // One-shot hydration of several interactive states from the async prefs
    // snapshot — the guard above makes it run exactly once, no cascade risk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (c.tab === 'pages' || c.tab === 'blocks' || c.tab === 'design') setTab(c.tab);
    if (typeof c.device === 'string' && c.device in DEVICE) setDevice(c.device as keyof typeof DEVICE);
    if (typeof c.previewWidth === 'number') setPreviewWidth(clampPreviewWidth(c.previewWidth));
    if (typeof c.previewDark === 'boolean') setPreviewDark(c.previewDark);
    if (Array.isArray(c.collapsed)) setCollapsed(new Set(c.collapsed.filter((x): x is string => typeof x === 'string')));
    if (typeof c.pageId === 'string' && doc.pages.some((p) => p.id === c.pageId)) setPageId(c.pageId);
  }, [prefs, siteMeta, siteId, doc]);

  useEffect(() => {
    if (!chromeApplied.current || !siteId) return;
    setPref(`builder:${siteId}`, { pageId, tab, device, previewWidth, previewDark, collapsed: [...collapsed] });
  }, [siteId, pageId, tab, device, previewWidth, previewDark, collapsed]);

  // Load the tenant's draft doc. The builder always works on a concrete site
  // (?site=<id>); without it we send the user to the dashboard to pick one.
  useEffect(() => {
    if (!siteId) {
      router.replace('/dashboard');
      return;
    }
    fetch(`/api/builder?site=${encodeURIComponent(siteId)}`)
      .then(async (r) => {
        if (r.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(`/studio/builder?site=${siteId}`)}`);
          return null;
        }
        if (!r.ok) {
          router.replace('/dashboard');
          return null;
        }
        return r.json() as Promise<{ doc: BuilderDoc; site: SiteMeta }>;
      })
      .then((d) => {
        if (!d) return;
        if (d.doc?.pages?.length) {
          skipHistory.current = true; // the fetched doc is the baseline, not an undoable edit
          setDoc(d.doc);
          // Open the home page (path '') by default, not just the first in the list.
          setPageId((d.doc.pages.find((p) => p.path === '') ?? d.doc.pages[0]).id);
        }
        setSiteMeta(d.site);
      })
      .catch(() => setMsg(tr('Не удалось загрузить сайт.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tr is locale-derived; re-running on locale change isn't needed here
  }, [siteId, router]);

  // ---- undo / redo history ----
  // Imperative ref-based history: the doc-watcher effect records each change.
  // canUndo/canRedo live in state (histCaps) so render never reads the refs.
  const past = useRef<BuilderDoc[]>([]);
  const future = useRef<BuilderDoc[]>([]);
  const skipHistory = useRef(true); // skip the very first (mount) doc
  const prevDoc = useRef<BuilderDoc>(doc);
  const lastHistPush = useRef(0); // coalesce rapid typing into one undo step
  const [histCaps, setHistCaps] = useState({ undo: false, redo: false });
  const undo = () => {
    const p = past.current.pop();
    if (!p) return;
    future.current.push(doc);
    // eslint-disable-next-line react-hooks/immutability -- history refs owned by undo/redo
    skipHistory.current = true;
    lastHistPush.current = 0;
    setDoc(p);
    setHistCaps({ undo: past.current.length > 0, redo: true });
    setDirty(true);
  };
  const redo = () => {
    const n = future.current.pop();
    if (!n) return;
    past.current.push(doc);
    // eslint-disable-next-line react-hooks/immutability -- history refs owned by undo/redo
    skipHistory.current = true;
    lastHistPush.current = 0;
    setDoc(n);
    setHistCaps({ undo: true, redo: future.current.length > 0 });
    setDirty(true);
  };
  useEffect(() => {
    if (skipHistory.current) {
      // eslint-disable-next-line react-hooks/immutability -- bookkeeping refs owned by this effect
      skipHistory.current = false;
      prevDoc.current = doc;
      return;
    }
    if (prevDoc.current !== doc) {
      // Edits landing within 600ms merge into one undo step (Ctrl+Z reverts a
      // typed word, not one character) and the 60-slot history isn't burned
      // through by a single sentence.
      const now = Date.now();
      if (now - lastHistPush.current > 600) {
        past.current.push(prevDoc.current);
        if (past.current.length > 60) past.current.shift();
      }
      lastHistPush.current = now;
      future.current = [];
      prevDoc.current = doc;
      setHistCaps({ undo: past.current.length > 0, redo: false });
      setDirty(true);
    }
  }, [doc]);
  const canUndo = histCaps.undo;
  const canRedo = histCaps.redo;

  // Click-to-select coming from the live preview iframe (edit mode).
  const previewRef = useRef<HTMLIFrameElement>(null);
  const stateRef = useRef({ doc, pageId, selectedId, previewDark, siteSlug: siteMeta?.slug, siteId: siteMeta?.id });
  // Mirrored in an effect (declared before the pushing effect below, so the
  // snapshot is always fresh by the time postPreview fires).
  useEffect(() => {
    stateRef.current = { doc, pageId, selectedId, previewDark, siteSlug: siteMeta?.slug, siteId: siteMeta?.id };
  }, [doc, pageId, selectedId, previewDark, siteMeta]);
  // Hovering a theme in the top-bar select live-previews it (with its button
  // preset) in the iframe without touching the doc; leaving/closing restores.
  const [hoverTheme, setHoverTheme] = useState<string | null>(null);
  const hoverThemeRef = useRef<string | null>(null);
  useEffect(() => { hoverThemeRef.current = hoverTheme; }, [hoverTheme]);
  // Coalesced to one postMessage per frame: serializing the full doc for the
  // iframe on every keystroke is the single biggest source of typing jank.
  const postRaf = useRef(0);
  // Immediate, uncoalesced send — used for the one-shot 'ready' handshake and
  // iframe onLoad, where a dropped message means the preview never renders.
  const sendState = useCallback(() => {
    const s = stateRef.current;
    const hover = hoverThemeRef.current;
    const previewDoc = hover ? { ...s.doc, themeId: hover, ...(THEME_BTN_PRESETS[hover] ?? {}) } : s.doc;
    previewRef.current?.contentWindow?.postMessage({ source: 'builder-editor', ...s, doc: previewDoc }, '*');
  }, []);
  const postPreview = useCallback(() => {
    if (postRaf.current) return;
    postRaf.current = requestAnimationFrame(() => {
      postRaf.current = 0;
      sendState();
    });
  }, [sendState]);
  useEffect(() => () => { if (postRaf.current) cancelAnimationFrame(postRaf.current); }, []);
  // While the palette is being dragged the picked shade is painted on the
  // target element by a tiny <style> inside the preview — no doc update, no
  // re-render. The next full state message (sent on commit) clears the hint.
  const sendColorHint = useCallback((id: string, baseKey: string, value: string) => {
    const css = baseKey === 'bgColor' ? 'background' : baseKey === 'borderColor' ? 'border-color' : 'color';
    previewRef.current?.contentWindow?.postMessage({ source: 'builder-editor', type: 'stylehint', id, css, value }, '*');
  }, []);
  // Recently used custom colors (a per-user pref, follows the account across
  // browsers) and the EyeDropper screen picker where the browser supports it.
  const [recentRaw, setRecentRaw] = usePref<string[]>('builderRecentColors', []);
  const recentColors = Array.isArray(recentRaw) ? recentRaw.filter((c) => typeof c === 'string' && c.startsWith('#')).slice(0, 8) : [];
  const rememberColor = (v: string) => setRecentRaw([v, ...recentColors.filter((c) => c !== v)].slice(0, 8));
  const hasEyeDropper = useMounted() && 'EyeDropper' in window;
  const pickFromScreen = useCallback(async (commit: (v: string) => void) => {
    try {
      const ED = (window as unknown as { EyeDropper: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper;
      const { sRGBHex } = await new ED().open();
      commit(sRGBHex);
    } catch { /* user cancelled */ }
  }, []);

  // Insert an element dropped from the palette onto the live page, snapping it
  // into the nearest container, with validation hints when placement is risky.
  const dropOnPreview = useCallback((nodeType: NodeType, targetId: string | null) => {
    const { doc: d, pageId: pid } = stateRef.current;
    const pg = d.pages.find((p) => p.id === pid) ?? d.pages[0];
    if (!pg) return;
    const node = makeNode(nodeType);
    const applyBlocks = (blocks: BuilderNode[]) =>
      setDoc((prev) => ({ ...prev, pages: prev.pages.map((p) => (p.id === pg.id ? { ...p, blocks } : p)) }));
    const target = targetId ? findNode(pg.blocks, targetId) : null;

    if (nodeType === 'input' || nodeType === 'textarea') {
      const anc = targetId ? ancestorTypes(pg.blocks, targetId) : [];
      const insideForm = target?.type === 'form' || anc.includes('form');
      if (!insideForm) setMsg(tr('⚠ Поля ввода работают внутри «Формы». Добавьте блок «Форма» и перетащите поле в неё — иначе данные не отправятся.'));
    }
    if (target) {
      if (isContainer(target.type)) applyBlocks(insertChild(pg.blocks, target.id, node));
      else applyBlocks(insertAfter(pg.blocks, target.id, node));
    } else {
      applyBlocks([...pg.blocks, node]);
      if (nodeType !== 'section') setMsg(tr('💡 Совет: на верхнем уровне лучше сначала добавить «Секцию», а элементы помещать внутрь неё.'));
    }
    setSelectedId(node.id);
    setTab('blocks');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tr is locale-derived; handler reads latest via closure
  }, []);
  // Push live state to the preview on every change — instant, no save needed.
  useEffect(() => {
    postPreview();
  }, [doc, pageId, selectedId, previewDark, hoverTheme, postPreview]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.source !== 'builder-preview') return;
      if (e.data.type === 'ready') {
        // Authoritative "preview is listening" signal — send the current state
        // right now, bypassing the rAF coalescing so the handshake is never
        // swallowed by an earlier (possibly missed) onLoad post.
        if (postRaf.current) { cancelAnimationFrame(postRaf.current); postRaf.current = 0; }
        sendState();
      }
      else if (e.data.type === 'select' && e.data.id) {
        setSelectedId(e.data.id as string);
        setTab('blocks');
      } else if (e.data.type === 'drop' && e.data.nodeType) {
        dropOnPreview(e.data.nodeType as NodeType, (e.data.targetId as string | null) ?? null);
      } else if (e.data.type === 'rect') {
        const has = Boolean(e.data.id && e.data.rect);
        setSelRect(has ? { ...(e.data.rect as { top: number; left: number; width: number; height: number }), vw: Number(e.data.vw) || 0, vh: Number(e.data.vh) || 0 } : null);
        setSelColors(has ? { color: e.data.color as string, bg: e.data.bg as string, hasText: Boolean(e.data.hasText) } : null);
      } else if (e.data.type === 'edittext' && e.data.id && e.data.prop) {
        editTextRef.current(e.data.id as string, e.data.prop as string, String(e.data.value ?? ''));
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [sendState, dropOnPreview]);

  const page: BuilderPage | undefined = useMemo(
    () => doc.pages.find((p) => p.id === pageId) ?? doc.pages[0],
    [doc, pageId],
  );
  const selected = useMemo(
    () => (selectedId && page ? findNode(page.blocks, selectedId) : null),
    [selectedId, page],
  );

  // Reveal the active element in the Structure tree whenever the selection
  // changes (from the canvas or the tree): expand its collapsed ancestors so
  // the row exists, then scroll it into view — so it's obvious which block/
  // element is selected without hunting for it. Latest page via ref so this
  // only runs on selection changes, not on every edit.
  const pageRef = useRef(page);
  useEffect(() => { pageRef.current = page; });
  useEffect(() => {
    if (!selectedId) return;
    const pg = pageRef.current;
    if (!pg) return;
    const anc = ancestorPath(pg.blocks, selectedId);
    if (anc.some((a) => collapsed.has(a.id))) {
      setCollapsed((s) => {
        const next = new Set(s);
        anc.forEach((a) => next.delete(a.id));
        return next;
      });
    }
    // Double rAF: wait past the (possible) expand re-render + commit so the row
    // is in the DOM before scrolling.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-tree-nid="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }),
    );
    return () => cancelAnimationFrame(raf);
    // collapsed intentionally omitted: expansion is derived from selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Apply a blocks transform to the CURRENT page using the latest state — never
  // a render-time snapshot — so consecutive edits accumulate instead of the
  // last one overwriting the rest.
  const setBlocks = (fn: (blocks: BuilderNode[]) => BuilderNode[]) =>
    commitDoc((d) => {
      const pid = page?.id ?? d.pages[0]?.id;
      return { ...d, pages: d.pages.map((p) => (p.id === pid ? { ...p, blocks: fn(p.blocks) } : p)) };
    });
  // Apply a doc mutation, then mirror the edited symbol onto all its linked
  // copies (edit once → changes everywhere). Canonical = current selection.
  const commitDoc = (updater: (d: BuilderDoc) => BuilderDoc) =>
    setDoc((d) => {
      const next = updater(d);
      const cid = stateRef.current.selectedId;
      if (!cid) return next;
      let master: BuilderNode | null = null;
      for (const pg of next.pages) { const m = findSymbolOf(pg.blocks, cid); if (m) { master = m; break; } }
      if (!master || !master.props.symbolId) return next;
      const sid = master.props.symbolId;
      return { ...next, pages: next.pages.map((pg) => ({ ...pg, blocks: applySymbol(pg.blocks, sid, master!, master!.id) })) };
    });

  const addNode = (type: NodeType) => {
    if (!page) return;
    const node = makeNode(type);
    if (selected && isContainer(selected.type)) setBlocks((b) => insertChild(b, selected.id, node));
    else setBlocks((b) => [...b, node]);
    setSelectedId(node.id);
  };

  const patch = (id: string, p: Record<string, string>) => setBlocks((b) => updateProps(b, id, p));
  useEffect(() => { editTextRef.current = (id, prop, value) => patch(id, { [prop]: value }); });
  // Responsive override management: clear all overrides for a breakpoint, or copy
  // the values from the next-smaller breakpoint into it (empty string = "unset").
  const resetBreakpoint = (id: string, dev: keyof typeof DEVICE) => {
    const suf = BP_SUFFIX[dev];
    if (!suf) return;
    const patchObj: Record<string, string> = {};
    ALL_RESP_KEYS.forEach((k) => { patchObj[k + suf] = ''; });
    patch(id, patchObj);
  };
  const copyToBreakpoint = (id: string, dev: keyof typeof DEVICE, props: Record<string, string>) => {
    const suf = BP_SUFFIX[dev];
    if (!suf) return;
    const from: keyof typeof DEVICE = dev === 'full' ? 'tablet' : 'mobile';
    const patchObj: Record<string, string> = {};
    ALL_RESP_KEYS.forEach((k) => { const v = respValue(props, k, from); if (v) patchObj[k + suf] = v; });
    patch(id, patchObj);
  };
  // ---- Style presets (feature 3) ----
  const stylePresets = doc.stylePresets ?? [];
  const saveStylePreset = () => {
    if (!selected) return;
    const props = collectStyleProps(selected.props);
    if (Object.keys(props).length === 0) { setMsg(tr('У элемента нет заданных стилей для сохранения.')); return; }
    const name = window.prompt(tr('Название стиль-пресета'))?.trim();
    if (!name) return;
    setDoc((d) => ({ ...d, stylePresets: [...(d.stylePresets ?? []), { id: newId('preset'), name, props }] }));
    setMsg(tr('Стиль-пресет сохранён.'));
  };
  const applyStylePreset = (ps: { props: Record<string, string> }) => { if (selected) patch(selected.id, ps.props); };
  const deleteStylePreset = (id: string) => setDoc((d) => ({ ...d, stylePresets: (d.stylePresets ?? []).filter((p) => p.id !== id) }));
  // ---- Copy / paste style between elements (feature 4) ----
  const copyStyle = () => {
    if (!selected) return;
    const props = collectStyleProps(selected.props);
    if (Object.keys(props).length === 0) { setMsg(tr('У элемента нет заданных стилей для копирования.')); return; }
    setCopiedStyle(props);
    setMsg(tr('Стиль скопирован.'));
  };
  const pasteStyle = () => {
    if (!selected || !copiedStyle) return;
    // Clear the target's existing style props first, then apply the copied ones,
    // so paste replaces the look exactly (no leftovers from the old element).
    const cleared: Record<string, string> = {};
    for (const k of Object.keys(collectStyleProps(selected.props))) cleared[k] = '';
    patch(selected.id, { ...cleared, ...copiedStyle });
    setMsg(tr('Стиль вставлен.'));
  };
  // ---- Reusable blocks / symbols (feature 2) ----
  const symbolsMap = useMemo(() => {
    const m = new Map<string, string>();
    doc.pages.forEach((p) => collectSymbols(p.blocks, m));
    return m;
  }, [doc]);
  const makeSymbol = () => {
    if (!selected || selected.props.symbolId) return;
    const name = window.prompt(tr('Название общего блока'))?.trim();
    if (!name) return;
    patch(selected.id, { symbolId: newId('sym'), symbolName: name });
    setMsg(tr('Блок стал общим — вставляйте копии, правки синхронизируются.'));
  };
  const insertSymbolCopy = (sid: string) => {
    let src: BuilderNode | null = null;
    for (const pg of doc.pages) { const f = findBySymbol(pg.blocks, sid); if (f) { src = f; break; } }
    if (!src) return;
    const copy = cloneWithNewIds(src); // keeps props incl. symbolId + symbolName
    if (selected && isContainer(selected.type)) setBlocks((b) => insertChild(b, selected.id, copy));
    else setBlocks((b) => [...b, copy]);
    setSelectedId(copy.id);
  };
  const detachSymbol = () => {
    if (!selected?.props.symbolId) return;
    patch(selected.id, { symbolId: '', symbolName: '' });
    setMsg(tr('Блок отвязан от общего — теперь правится независимо.'));
  };

  const duplicate = (id: string) => {
    if (!page) return;
    const { nodes, newId: nid } = duplicateNode(page.blocks, id);
    setBlocks(() => nodes);
    if (nid) setSelectedId(nid);
  };

  // Clipboard for blocks (copy/cut/paste a whole subtree across pages).
  const clipboard = useRef<BuilderNode | null>(null);
  const [hasClip, setHasClip] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  // Pointer-based palette drag (works across the preview iframe boundary, where
  // native HTML5 DnD does not). `dragType` = element being dragged, `ghost` =
  // floating label position following the cursor.
  const [dragType, setDragType] = useState<NodeType | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const dragActive = useRef(false);
  const copyNode = (id: string) => {
    const n = page ? findNode(page.blocks, id) : null;
    if (!n) return;
    clipboard.current = cloneWithNewIds(n); // pre-freshened snapshot, independent of edits
    setHasClip(true);
    setMsg(tr('Блок скопирован — Ctrl+V, чтобы вставить.'));
  };
  const pasteNode = () => {
    if (!page || !clipboard.current) return;
    const node = cloneWithNewIds(clipboard.current); // fresh ids on every paste
    if (selected && isContainer(selected.type)) setBlocks((b) => insertChild(b, selected.id, node));
    else if (selectedId) setBlocks((b) => insertAfter(b, selectedId, node));
    else setBlocks((b) => [...b, node]);
    setSelectedId(node.id);
  };
  const deleteNode = (id: string) => {
    setBlocks((b) => removeNode(b, id));
    if (selectedId === id) setSelectedId(null);
  };

  // Drag-and-drop within the structure tree.
  const dragId = useRef<string | null>(null);
  const paletteDrag = useRef<NodeType | null>(null);
  // Pointer-drag a palette element onto the live preview. We follow the cursor
  // with a ghost label and, while over the iframe, ask it (by coordinates) to
  // highlight the container under the cursor; on release we drop into it. This
  // sidesteps native HTML5 DnD, which does not cross the iframe boundary.
  const startPaletteDrag = (t: NodeType, e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    const startX = e.clientX, startY = e.clientY;
    dragActive.current = false;
    const post = (msg: Record<string, unknown>) => previewRef.current?.contentWindow?.postMessage({ source: 'builder-editor', ...msg }, '*');
    const inFrame = (x: number, y: number) => {
      const r = previewRef.current?.getBoundingClientRect();
      return r ? x >= r.left && x <= r.right && y >= r.top && y <= r.bottom : false;
    };
    let hlRow: Element | null = null;
    const highlightTreeRow = (el: Element | null) => {
      if (hlRow === el) return;
      hlRow?.classList.remove('b-drop-into');
      hlRow = el;
      hlRow?.classList.add('b-drop-into');
    };
    const move = (ev: MouseEvent) => {
      if (!dragActive.current) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return; // click, not drag
        dragActive.current = true;
        paletteDrag.current = t;
        setDragType(t);
      }
      setGhost({ x: ev.clientX, y: ev.clientY });
      const r = previewRef.current?.getBoundingClientRect();
      if (r && inFrame(ev.clientX, ev.clientY)) {
        post({ type: 'dragpoint', x: ev.clientX - r.left, y: ev.clientY - r.top });
        highlightTreeRow(null);
      } else {
        post({ type: 'dragpoint', x: -1, y: -1 });
        const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
        highlightTreeRow(el?.closest('[data-tree-nid]') ?? null);
      }
    };
    const up = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      const wasDrag = dragActive.current;
      dragActive.current = false;
      setDragType(null);
      setGhost(null);
      highlightTreeRow(null);
      const type = paletteDrag.current;
      paletteDrag.current = null;
      if (!wasDrag) { addNode(t); return; } // treated as a click → insert into selection
      const r = previewRef.current?.getBoundingClientRect();
      if (type && r && inFrame(ev.clientX, ev.clientY)) {
        post({ type: 'dropAt', x: ev.clientX - r.left, y: ev.clientY - r.top, nodeType: type });
        return;
      }
      // Dropped over the structure tree → insert into/after that node (fully
      // reliable, same document).
      if (type) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
        const row = el?.closest('[data-tree-nid]') as HTMLElement | null;
        if (row) {
          const id = row.getAttribute('data-tree-nid')!;
          const isCont = row.getAttribute('data-tree-container') === '1';
          const node = makeNode(type);
          setBlocks((b) => (isCont ? insertChild(b, id, node) : insertAfter(b, id, node)));
          setSelectedId(node.id);
          return;
        }
      }
      post({ type: 'dragpoint', x: -1, y: -1 });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  // Drop a palette element onto the empty page area (append to root).
  const onRootDrop = () => {
    const pType = paletteDrag.current;
    paletteDrag.current = null;
    dragId.current = null;
    if (!page || !pType) return;
    const node = makeNode(pType);
    setBlocks((b) => [...b, node]);
    setSelectedId(node.id);
  };

  // Image upload for the selected image node.
  const uploadRef = useRef<HTMLInputElement>(null);
  const uploadDarkRef = useRef<HTMLInputElement>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  // Logo upload (writes to doc.logoUrl instead of a node).
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const uploadLogo = async (file: File) => {
    setLogoBusy(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) setDoc((d) => ({ ...d, logoUrl: data.url, brandMode: d.brandMode === 'text' || !d.brandMode ? 'both' : d.brandMode }));
      else setMsg(data.error || tr('Ошибка загрузки'));
    } catch {
      setMsg(tr('Ошибка загрузки'));
    } finally {
      setLogoBusy(false);
    }
  };
  const uploadImage = async (file: File, nodeId: string, key: string = 'src') => {
    setUploadBusy(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) patch(nodeId, { [key]: data.url });
      else setMsg(data.error || tr('Ошибка загрузки'));
    } catch {
      setMsg(tr('Ошибка загрузки'));
    } finally {
      setUploadBusy(false);
    }
  };
  // Photo/video upload for the media grid — appends a "URL::Title[::::Poster]"
  // line to the node's items list (uploads land in R2 when it is configured).
  const gridUploadRef = useRef<HTMLInputElement>(null);
  const gridDarkUploadRef = useRef<HTMLInputElement>(null);
  const darkRowRef = useRef<number>(-1);
  const videoUploadRef = useRef<HTMLInputElement>(null);
  const uploadGridMedia = async (files: File[], nodeId: string, items: string) => {
    setUploadBusy(true);
    setMsg('');
    // Sequential on purpose: each file runs through ffmpeg on the server, and
    // the grid updates line by line as uploads finish.
    let acc = items.trimEnd();
    const failed: string[] = [];
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) {
          failed.push(file.name);
          continue;
        }
        const title = file.name.replace(/\.[^.]+$/, '');
        const line = data.poster ? `${data.url}::${title}::::${data.poster}` : `${data.url}::${title}`;
        acc = acc ? `${acc}\n${line}` : line;
        patch(nodeId, { items: acc });
      } catch {
        failed.push(file.name);
      }
    }
    if (failed.length) setMsg(`${tr('Ошибка загрузки')}: ${failed.join(', ')}`);
    setUploadBusy(false);
  };
  // Upload one file as the DARK-theme variant of a specific grid row.
  const uploadGridItemDark = async (file: File, nodeId: string, rows: GridItem[], i: number) => {
    setUploadBusy(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        const next = rows.map((r, idx) => (idx === i ? { ...r, srcDark: data.url, posterDark: data.poster || '' } : r));
        patch(nodeId, { items: serializeGridItems(next) });
      } else setMsg(data.error || tr('Ошибка загрузки'));
    } catch {
      setMsg(tr('Ошибка загрузки'));
    } finally {
      setUploadBusy(false);
    }
  };

  // Generate a whole page from a brief.
  const [brief, setBrief] = useState('');
  const [genBusy, setGenBusy] = useState(false);
  const generatePage = async () => {
    if (!brief.trim()) return;
    setGenBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, title: brief.trim().slice(0, 40), path: '' }),
      });
      const data = await res.json();
      if (res.ok && data.page) {
        addPageDoc(data.page as BuilderPage);
        setBrief('');
        setMsg(tr('Страница создана ({src}). Не забудьте «Сохранить».').replace('{src}', data.source === 'llm' ? 'LLM' : tr('шаблон')));
      } else setMsg(data.error || tr('Ошибка генерации'));
    } catch {
      setMsg(tr('Ошибка генерации'));
    } finally {
      setGenBusy(false);
    }
  };

  // ---- pages ----
  const addPage = () => {
    const title = newTitle.trim() || tr('Новая страница');
    const path = newPath.trim().replace(/^\/+|\/+$/g, '');
    if (doc.pages.some((p) => p.path === path)) {
      setMsg(tr('Путь "{path}" уже занят').replace('{path}', path));
      return;
    }
    const p: BuilderPage = { id: newId('page'), path, title, blocks: [] };
    setDoc((d) => ({ ...d, pages: [...d.pages, p] }));
    setPageId(p.id);
    setNewTitle('');
    setNewPath('');
  };
  const deletePage = (id: string) => {
    if (doc.pages.length <= 1) return;
    setDoc((d) => ({ ...d, pages: d.pages.filter((p) => p.id !== id) }));
    if (pageId === id) setPageId(doc.pages.find((p) => p.id !== id)?.id ?? '');
  };
  const renamePage = (field: 'title' | 'path' | 'description', val: string) =>
    setDoc((d) => ({ ...d, pages: d.pages.map((p) => (p.id === page?.id ? { ...p, [field]: field === 'path' ? val.replace(/^\/+|\/+$/g, '') : val } : p)) }));

  // Swap the chosen page into the site root: it takes the empty path and the
  // former homepage inherits its old one, so neither page loses its URL.
  const makeHomepage = (id: string) => {
    const target = doc.pages.find((p) => p.id === id);
    if (!target || target.path === '') return;
    const oldHome = doc.pages.find((p) => p.path === '');
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p) =>
        p.id === id ? { ...p, path: '' } : p.path === '' ? { ...p, path: target.path } : p,
      ),
    }));
    setMsg(oldHome
      ? tr('«{title}» теперь главная страница. Прежняя главная («{old}») доступна по /{path}.').replace('{title}', target.title).replace('{old}', oldHome.title).replace('{path}', target.path)
      : tr('«{title}» теперь главная страница.').replace('{title}', target.title));
  };

  // Adds a page, ensuring its path is unique; selects it.
  const addPageDoc = (np: BuilderPage): BuilderPage => {
    let base = np.path ?? '';
    if (base === '' && doc.pages.some((p) => p.path === '')) base = 'home';
    let path = base;
    let i = 2;
    while (doc.pages.some((p) => p.path === path)) path = `${base || 'page'}-${i++}`;
    const created: BuilderPage = { ...np, id: newId('page'), path };
    setDoc((d) => ({ ...d, pages: [...d.pages, created] }));
    setPageId(created.id);
    setSelectedId(null);
    return created;
  };
  const addTemplate = (id: string) => {
    const t = [...LANDINGS, ...TEMPLATES].find((x) => x.id === id);
    if (!t) return;
    const built = buildTemplatePage(t, locale);
    const chrome = {
      ...(t.themeId ? { themeId: t.themeId } : {}),
      ...(t.asideVariant ? { asideVariant: t.asideVariant } : {}),
      ...(t.headerVariant ? { headerVariant: t.headerVariant } : {}),
      ...(t.headerBehavior ? { headerBehavior: t.headerBehavior } : {}),
      ...(t.footerVariant ? { footerVariant: t.footerVariant } : {}),
      // Chrome buttons in the landing's design language (style only).
      ...(t.authLoginVariant ? { authLoginVariant: t.authLoginVariant } : {}),
      ...(t.authCtaVariant ? { authCtaVariant: t.authCtaVariant } : {}),
      ...(t.authBtnSize ? { authBtnSize: t.authBtnSize } : {}),
      ...(t.authBtnRounded ? { authBtnRounded: t.authBtnRounded } : {}),
      ...(t.footerBtnVariant ? { footerBtnVariant: t.footerBtnVariant } : {}),
      ...(t.navStyle ? { navStyle: t.navStyle } : {}),
      ...(t.headerCtaText ? { headerCtaText: t.headerCtaText } : {}),
    };

    // Full-site scaffold: a landing with matching sub-pages sets up the WHOLE
    // site in one click — home + About/Portfolio/Contact in the landing's own
    // design language — and wires the header menu + footer links to them.
    // Sub-pages are upserted by path (existing ones are re-styled, not
    // duplicated); everything is one undoable step (Ctrl+Z reverts it all).
    if (t.subpages) {
      const subs = buildSubpages(t, locale);
      const homeId = doc.pages.find((p) => p.path === '')?.id ?? built.id;
      setDoc((d) => {
        const hasHome = d.pages.some((p) => p.path === '');
        let pages: BuilderPage[] = hasHome
          ? d.pages.map((p) => (p.path === '' ? { ...p, title: built.title, description: built.description, blocks: built.blocks } : p))
          : [built, ...d.pages];
        for (const s of subs) {
          pages = pages.some((p) => p.path === s.path)
            ? pages.map((p) => (p.path === s.path ? { ...p, title: s.title, description: s.description, blocks: s.blocks } : p))
            : [...pages, s];
        }
        const nav = [{ label: tplText('Главная', locale), href: '/site' }, ...pages.filter((p) => p.path !== '').map((p) => ({ label: p.title, href: `/site/${p.path}` }))];
        const footerLinks = pages.filter((p) => p.path === 'about' || p.path === 'contact').map((p) => ({ label: p.title, href: `/site/${p.path}` }));
        return { ...d, pages, nav, footer: { ...d.footer, links: footerLinks.length ? footerLinks : d.footer.links }, ...chrome };
      });
      setPageId(homeId);
      setSelectedId(null);
      setMsg(tr('Сайт собран в стиле «{label}»: Главная + О нас + Портфолио + Контакты. Тема, меню и подвал применены. Ctrl+Z отменит.').replace('{label}', tplText(t.label, locale)));
      return;
    }

    // If the current home page (path '') is still the untouched auto-generated
    // starter, replace it in place so the landing becomes the site root
    // (/s/<slug>) — no stray /home-N page, and the logo/home link shows it
    // immediately. Any edit to the home page opts out of this (adds a page).
    const home = doc.pages.find((p) => p.path === '');
    if (home && isPristineStarter(home)) {
      setDoc((d) => ({
        ...d,
        pages: d.pages.map((p) =>
          p.path === '' ? { ...p, title: built.title, description: built.description, blocks: built.blocks } : p,
        ),
        ...chrome,
      }));
      setPageId(home.id);
      setSelectedId(null);
      setMsg(tr('«{label}» стал главной страницей сайта{suffix}.').replace('{label}', tplText(t.label, locale)).replace('{suffix}', t.themeId ? tr(' (тема применена)') : ''));
      return;
    }

    const created = addPageDoc(built);
    if (Object.keys(chrome).length) setDoc((d) => ({ ...d, ...chrome }));
    setMsg(created.path === ''
      ? tr('«{label}» добавлен как главная страница{suffix}.').replace('{label}', tplText(t.label, locale)).replace('{suffix}', t.themeId ? tr(' (тема применена)') : '')
      : tr('«{label}» — новая страница /{path}{suffix}. Посетители по-прежнему увидят текущую главную — чтобы показать эту страницу первой, нажмите домик в списке страниц.').replace('{label}', tplText(t.label, locale)).replace('{path}', created.path).replace('{suffix}', t.themeId ? tr(' (тема применена)') : ''));
  };
  const addSectionPreset = (id: string) => {
    const s = SECTION_PRESETS.find((x) => x.id === id);
    if (!s || !page) return;
    const node = buildSection(s, locale);
    setBlocks((b) => [...b, node]);
    setSelectedId(node.id);
    setMsg(tr('Секция «{label}» добавлена в конец страницы.').replace('{label}', tplText(s.label, locale)));
  };

  // ---- nav / footer / brand ----
  const setNavLink = (i: number, key: 'label' | 'href', val: string) =>
    setDoc((d) => {
      let v = val;
      if (key === 'href') {
        const bare = v.trim().replace(/^\/+/, '').replace(/\/+$/, '');
        // If the author typed a bare "/portfolio" that matches an existing page,
        // rewrite it to the "/site/..." base so it rebases to /s/<slug>/... at
        // render time and keeps the visitor inside this organization's site.
        if (v.startsWith('/') && !v.startsWith('/site') && !v.startsWith('http') && d.pages.some((p) => p.path === bare)) {
          v = bare ? `/site/${bare}` : '/site';
        }
      }
      return { ...d, nav: d.nav.map((l, j) => (j === i ? { ...l, [key]: v } : l)) };
    });
  const addNavLink = () => setDoc((d) => ({ ...d, nav: [...d.nav, { label: 'Пункт', href: '/site' }] }));
  const removeNavLink = (i: number) => setDoc((d) => ({ ...d, nav: d.nav.filter((_, j) => j !== i) }));

  // Save the draft to the tenant site. Always sends the latest doc (via
  // stateRef) and only clears `dirty` if no edit happened while the request
  // was in flight. Returns true on success so publish can chain on top of it.
  // savingRef holds the in-flight request: manual save/publish waits it out
  // and saves again; autosave bails and gets rescheduled via saveTick.
  const savingRef = useRef<Promise<boolean> | null>(null);
  const [saveTick, setSaveTick] = useState(0);
  const saveDraft = (auto = false): Promise<boolean> => {
    if (!siteId) return Promise.resolve(false);
    if (savingRef.current) {
      if (auto) return Promise.resolve(false);
      return savingRef.current.then(() => saveDraft(auto), () => saveDraft(auto));
    }
    const run = async (): Promise<boolean> => {
      const sentDoc = stateRef.current.doc;
      try {
        const res = await fetch(`/api/builder?site=${encodeURIComponent(siteId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sentDoc),
        });
        const data = await res.json();
        if (res.ok) {
          if (stateRef.current.doc === sentDoc) setDirty(false);
          const liveMsg = data.published ? tr(' · обновлено в live') : '';
          setMsg(auto ? tr('Автосохранено{live}').replace('{live}', liveMsg) : tr('Сохранено · страниц: {n}{live}').replace('{n}', String(data.pages)).replace('{live}', liveMsg));
          if (!auto) setPreviewKey((k) => k + 1);
          return true;
        }
        setMsg(data.error || tr('Ошибка'));
        return false;
      } finally {
        savingRef.current = null;
        setSaveTick((t) => t + 1); // reschedule autosave if edits arrived mid-request
      }
    };
    savingRef.current = run();
    return savingRef.current;
  };

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      await saveDraft();
    } catch {
      setMsg(tr('Ошибка сохранения'));
    } finally {
      setBusy(false);
    }
  };

  // Keyboard shortcuts. Declared after save/duplicate/copy/paste/delete so the
  // handler references only already-initialized bindings.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      // These work even while a field is focused.
      if (mod && k === 's') { e.preventDefault(); void save(); return; }
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); redo(); return; }
      // The rest are canvas shortcuts — skip them while editing text in a field.
      if (typing) return;
      if (mod && k === 'd' && selectedId) { e.preventDefault(); duplicate(selectedId); return; }
      if (mod && k === 'c' && selectedId) { e.preventDefault(); copyNode(selectedId); return; }
      if (mod && k === 'v' && clipboard.current) { e.preventDefault(); pasteNode(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); deleteNode(selectedId); return; }
      if (e.key === 'Escape' && selectedId) { e.preventDefault(); setSelectedId(null); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, selectedId]);

  // Debounced autosave: edits land in the DB after 2s of inactivity, so
  // closing the tab can't lose more than the last couple of seconds of work.
  useEffect(() => {
    if (!dirty || !siteMeta) return;
    const t = setTimeout(() => {
      saveDraft(true).catch(() => setMsg(tr('Автосохранение не удалось — проверьте сеть.')));
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, doc, siteMeta, saveTick]);

  // Warn before leaving with unsaved edits (e.g. autosave hasn't fired yet).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // Best-effort synchronous flush that survives the page unload.
      if (siteId) {
        try {
          fetch(`/api/builder?site=${encodeURIComponent(siteId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stateRef.current.doc),
            keepalive: true,
          });
        } catch { /* ignore */ }
      }
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, siteId]);

  // Flush unsaved edits when leaving the builder via in-app navigation
  // (SPA route change unmounts this component without firing beforeunload).
  useEffect(() => {
    return () => {
      if (dirtyRef.current && siteId) {
        try {
          fetch(`/api/builder?site=${encodeURIComponent(siteId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stateRef.current.doc),
            keepalive: true,
          });
        } catch { /* ignore */ }
      }
    };
  }, [siteId]);

  const [pubBusy, setPubBusy] = useState(false);
  const publish = async () => {
    if (!siteId) return;
    setPubBusy(true);
    setMsg('');
    try {
      if (!(await saveDraft())) return; // publish snapshots the draft — save it first
      const res = await fetch(`/api/sites/${siteId}/publish`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSiteMeta((m) => (m ? { ...m, published: true } : m));
        setMsg(siteMeta?.slug === '__landing__' ? tr('Опубликовано — лендинг обновлён на «/»') : tr('Опубликовано — сайт доступен по /s/{slug}').replace('{slug}', siteMeta?.slug ?? ''));
      } else setMsg(data.error || tr('Ошибка публикации'));
    } catch {
      setMsg(tr('Ошибка публикации'));
    } finally {
      setPubBusy(false);
    }
  };

  // Reset the landing to its initial seeded state + unpublish (staff only). This
  // is the escape hatch: once a site is published, every save re-syncs the live
  // copy, so this cleanly reverts / back to the coded showcase.
  const [resetBusy, setResetBusy] = useState(false);
  const resetLanding = async () => {
    const ok = await confirm({
      title: tr('Сбросить лендинг к начальному виду?'),
      description: tr('Все изменения лендинга будут удалены, а страница «/» вернётся к исходному оформлению со всеми эффектами.'),
      confirmLabel: tr('Сбросить'),
      tone: 'warning',
    });
    if (!ok) return;
    setResetBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/landing-site/reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.doc) {
        skipHistory.current = true;
        past.current = [];
        future.current = [];
        setHistCaps({ undo: false, redo: false });
        setDoc(data.doc);
        setPageId((data.doc.pages.find((p: { path: string; id: string }) => p.path === '') ?? data.doc.pages[0]).id);
        setSelectedId(null);
        setSiteMeta((m) => (m ? { ...m, published: false } : m));
        setDirty(false);
        setPreviewKey((k) => k + 1);
        setMsg(tr('Лендинг сброшен к начальному виду.'));
      } else setMsg(data.error || tr('Ошибка'));
    } catch {
      setMsg(tr('Ошибка'));
    } finally {
      setResetBusy(false);
    }
  };

  // Owner draft preview on the tenant route ('?draft=1' shows unsaved-published work).
  const isLanding = siteMeta?.slug === '__landing__';
  const previewSrc = isLanding
    ? '/'
    : siteMeta
    ? `/s/${siteMeta.slug}${page?.path ? `/${page.path}` : ''}?draft=1`
    : '/dashboard';

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background">
      {confirmDialog}
      {/* Toolbar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[120rem] items-center gap-1.5 px-2 sm:gap-2 sm:px-4 xl:gap-3">
          <Link href={isLanding ? '/studio' : '/dashboard'} className="flex shrink-0 items-center gap-2 font-bold tracking-tight" title={isLanding ? tr('Назад в Студию') : tr('К списку сайтов')}>
            <LayoutTemplate className="h-5 w-5 text-primary" /> <span className="hidden md:inline">{t.studioLabel}</span>
          </Link>
          <div className="mx-1 hidden h-6 w-px bg-border md:block xl:mx-2" />
          {isLanding && (
            <span className="mr-1 hidden shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary lg:inline-flex" title={tr('Вы редактируете главную страницу сайта (/)')}>
              <Home className="h-3.5 w-3.5" /> {tr('Лендинг «/»')}
            </span>
          )}
          <Input value={doc.brand} onChange={(e) => setDoc((d) => ({ ...d, brand: e.target.value }))} className="hidden h-8 w-32 min-w-0 sm:block xl:w-44" aria-label={tr('Название сайта')} />
          <div className="hidden items-center gap-1 md:flex">
            <Palette className="h-4 w-4 text-muted-foreground" />
            {/* Switching theme also applies its recommended chrome-button
                preset so header/footer buttons stay on-brand (undoable).
                Hovering an option previews it live in the iframe. */}
            <Select
              value={doc.themeId}
              onValueChange={(v) => { setHoverTheme(null); setDoc((d) => ({ ...d, themeId: v, ...(THEME_BTN_PRESETS[v] ?? {}) })); }}
              onOpenChange={(o) => { if (!o) setHoverTheme(null); }}
            >
              <SelectTrigger className="h-8 w-40"><SelectValue placeholder={tr('Тема')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto" onPointerEnter={() => setHoverTheme('auto')} onFocus={() => setHoverTheme('auto')}>{tr('Авто')}</SelectItem>
                {THEMES.map((t) => (
                  <SelectItem key={t.id} value={t.id} onPointerEnter={() => setHoverTheme(t.id)} onFocus={() => setHoverTheme(t.id)}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Below lg the panel and preview can't sit side by side — toggle between them. */}
          <div className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-border p-0.5 lg:hidden">
            {(['panel', 'preview'] as const).map((v) => {
              const Icon = v === 'panel' ? PanelLeft : Eye;
              const label = v === 'panel' ? tr('Редактор') : tr('Предпросмотр');
              return (
                <button key={v} onClick={() => setMobileView(v)} className={`rounded-md p-1.5 transition-colors ${mobileView === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} aria-label={label} title={label}>
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border p-0.5 lg:ml-auto">
            {(['full', 'tablet', 'mobile'] as const).map((dv) => {
              const Icon = dv === 'full' ? Monitor : dv === 'tablet' ? Tablet : Smartphone;
              return (
                <button key={dv} onClick={() => setDevice(dv)} className={`rounded-md p-1.5 transition-colors ${device === dv ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} aria-label={dv}>
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          <TutorialModal
            locale={locale as 'ru' | 'en' | 'hy'}
            scenes={[
              { src: `/media/tutorial-shot-1.${locale}.webp`, label: tr('Общий вид: палитра, живое превью, панель свойств'), arrow: { xPct: 58, yPct: 38, angle: 0 } },
              { src: `/media/tutorial-shot-2.${locale}.webp`, label: tr('Добавление блоков из палитры'), arrow: { xPct: 30, yPct: 28, angle: 180 } },
              { src: `/media/tutorial-shot-3.${locale}.webp`, label: tr('Адаптив: мобильный, планшет, десктоп'), arrow: { xPct: 64, yPct: 13, angle: 270 } },
              { src: `/media/tutorial-shot-4.${locale}.mp4`, label: tr('Готовые эффекты в один клик'), arrow: { xPct: 53, yPct: 40, angle: 180 } },
              { src: `/media/tutorial-shot-5.${locale}.mp4`, label: tr('Тонкая настройка: CSS-анимация и свой CSS'), arrow: { xPct: 53, yPct: 58, angle: 180 } },
              { src: '/media/tutorial-shot-6.webp', label: tr('Готовая страница и публикация'), arrow: { xPct: 10, yPct: 33, angle: 0 } },
            ]}
            labels={{
              watch: tr('Туториал'),
              title: tr('Как пользоваться конструктором'),
              soon: tr('Видео скоро появится'),
              soonHint: tr('Видео-туториал готовится. Как только оно будет добавлено, оно появится здесь.'),
              close: tr('Закрыть'),
            }}
          />
          <Link href={previewSrc} target="_blank" className="hidden shrink-0 sm:block"><Button size="sm" variant="outline" className="gap-1.5"><ExternalLink className="h-4 w-4" /> <span className="hidden xl:inline">{tr('Открыть')}</span></Button></Link>
          <div className="relative hidden lg:block">
            <button onClick={() => setShowKeys((v) => !v)} className={`rounded-md p-1.5 ${showKeys ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'}`} aria-label={tr('Горячие клавиши')} title={tr('Горячие клавиши')}><Keyboard className="h-4 w-4" /></button>
            {showKeys && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowKeys(false)} aria-hidden />
                <div className="absolute right-0 top-9 z-50 w-64 rounded-xl border border-border bg-card p-3 text-xs shadow-xl">
                  <p className="mb-2 font-semibold text-foreground">{tr('Горячие клавиши')}</p>
                  <ul className="space-y-1.5 text-muted-foreground">
                    {([
                      ['Сохранить', 'Ctrl S'], ['Отменить', 'Ctrl Z'], ['Повторить', 'Ctrl ⇧ Z'],
                      ['Дублировать блок', 'Ctrl D'], ['Копировать блок', 'Ctrl C'], ['Вставить блок', 'Ctrl V'],
                      ['Удалить блок', 'Delete'], ['Снять выделение', 'Esc'],
                    ] as [string, string][]).map(([label, keys]) => (
                      <li key={label} className="flex items-center justify-between gap-2">
                        <span>{tr(label)}</span>
                        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">{keys}</kbd>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
          <button onClick={undo} disabled={!canUndo} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label={tr('Отменить')} title={tr('Отменить (Ctrl+Z)')}><Undo2 className="h-4 w-4" /></button>
          <button onClick={redo} disabled={!canRedo} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label={tr('Повторить')} title={tr('Повторить (Ctrl+Shift+Z)')}><Redo2 className="h-4 w-4" /></button>
          <Button size="sm" onClick={save} disabled={busy || pubBusy} className="relative shrink-0 gap-1.5 px-2 md:px-3" title={dirty ? tr('Есть несохранённые изменения (автосохранение через пару секунд)') : tr('Всё сохранено')} aria-label={tr('Сохранить')}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} <span className="hidden md:inline">{tr('Сохранить')}</span>
            {dirty && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-amber-500" aria-label={tr('Несохранённые изменения')} />}
          </Button>
          <Button size="sm" variant={siteMeta?.published ? 'outline' : 'default'} onClick={publish} disabled={busy || pubBusy} className="shrink-0 gap-1.5 px-2 md:px-3" title={tr('Сохранить черновик и опубликовать')} aria-label={siteMeta?.published ? tr('Обновить') : tr('Опубликовать')}>
            {pubBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            <span className="hidden md:inline">{siteMeta?.published ? tr('Обновить') : tr('Опубликовать')}</span>
          </Button>
        </div>
        {msg && <div className="border-t border-border/60 bg-muted/40 px-4 py-1 text-center text-xs text-muted-foreground">{msg}</div>}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className={cn('min-w-0 flex-1 overflow-y-auto px-3 pb-3 @container lg:border-r lg:border-border/60', mobileView === 'preview' && 'hidden lg:block')}>
          {/* Tabs — pinned to the top of the panel so they stay visible while
              the rest of the panel scrolls. Negative margins cancel the aside's
              p-3 so the sticky bar spans full width and reaches the very top. */}
          <div className="sticky top-0 z-20 -mx-3 mb-2 border-b border-border/60 bg-background px-3 pb-2 pt-3">
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1">
              {([['pages', 'Страницы'], ['blocks', 'Блоки'], ['design', 'Сайт']] as const).map(([id, label]) => (
                <button key={id} data-tour={`tab-${id}`} onClick={() => setTab(id)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{tr(label)}</button>
              ))}
            </div>
          </div>

          {/* TAB: Страницы */}
          <div className={tab === 'pages' ? 'space-y-4' : 'hidden'}>
          {isLanding && (
            <Card className="border-primary/40 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-primary"><Home className="h-4 w-4" /> {tr('Редактирование лендинга')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{tr('Это лендинг («/»). Блок «Лендинг-герой» — настоящий кодовый герой со всеми эффектами (WebGL, браузер-макет, анимации); правьте его тексты в свойствах блока. Жмите «Опубликовать» — «/» обновится со всеми эффектами.')}</p>
              <Button size="sm" variant="outline" onClick={resetLanding} disabled={resetBusy || busy || pubBusy} className="mt-2.5 w-full gap-1.5">
                {resetBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />} {tr('Сбросить лендинг к начальному виду')}
              </Button>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{tr('Вернёт исходные секции и снимет публикацию — «/» снова покажет оригинальный лендинг со всеми эффектами.')}</p>
            </Card>
          )}
          {!isLanding && (<>
          {/* Ready-made landings */}
          <Card className="p-3">
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><LayoutTemplate className="h-4 w-4 text-primary" /> {tr('Готовые лендинги')}</p>
            <p className="mb-2 text-xs text-muted-foreground">{tr('Выберите лендинг — добавится как страница с подходящей темой, дальше меняйте под себя.')}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {LANDINGS.map((t) => (
                <div key={t.id} role="button" tabIndex={0} onClick={() => addTemplate(t.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addTemplate(t.id); } }} className="cursor-pointer overflow-hidden rounded-lg border border-border/60 text-left transition-colors hover:border-primary/60">
                  <LandingThumb def={t} />
                  <span className="block truncate px-2 pt-1.5 text-xs font-semibold">{tplText(t.label, locale)}</span>
                  <span className="line-clamp-2 block px-2 pb-2 text-[10px] leading-tight text-muted-foreground">{tplText(t.description, locale)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Generate page from brief */}
          <Card className="p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Wand2 className="h-4 w-4 text-primary" /> {tr('Сгенерировать страницу')}</p>
            <Textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} placeholder={tr('Опишите сайт: напр. «лендинг кофейни с меню и формой заявки»')} className="mb-2" />
            <Button size="sm" onClick={generatePage} disabled={genBusy || !brief.trim()} className="w-full gap-1.5">
              {genBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {tr('Создать по брифу')}
            </Button>
          </Card>

          {/* Ready-made templates */}
          <Card className="p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><LayoutGrid className="h-4 w-4 text-primary" /> {tr('Отдельные страницы')}</p>
            <div className="space-y-1.5">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => addTemplate(t.id)} className="w-full rounded-lg border border-border/60 p-2 text-left transition-colors hover:border-primary/50 hover:bg-muted/50">
                  <span className="flex items-center justify-between gap-2 text-sm font-medium"><span className="min-w-0 truncate">{tplText(t.label, locale)}</span><Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /></span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{tplText(t.description, locale)}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Pages */}
          <Card className="p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" /> {tr('Страницы')}</p>
            <div className="space-y-1">
              {doc.pages.map((p) => (
                <div key={p.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${p.id === page?.id ? 'bg-primary/10 text-foreground' : 'hover:bg-muted'}`}>
                  <button className="min-w-0 flex-1 truncate text-left" onClick={() => { setPageId(p.id); setSelectedId(null); }}>
                    {p.title} <span className="text-xs text-muted-foreground">{siteMeta ? `/s/${siteMeta.slug}${p.path ? `/${p.path}` : ''}` : `/${p.path}`}</span>
                  </button>
                  {p.path === '' ? (
                    <span title={tr('Главная страница — открывается по адресу сайта')} className="shrink-0 text-primary"><Home className="h-3.5 w-3.5" /></span>
                  ) : (
                    <button onClick={() => makeHomepage(p.id)} className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100" title={tr('Сделать главной страницей')} aria-label={tr('Сделать главной страницей')}><Home className="h-3.5 w-3.5" /></button>
                  )}
                  {doc.pages.length > 1 && (
                    <button onClick={() => deletePage(p.id)} className="text-muted-foreground hover:text-red-500" aria-label={tr('Удалить страницу')}><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-1.5 border-t border-border/60 pt-2">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={tr('Название')} className="h-8" />
              <div className="flex gap-1.5">
                <Input value={newPath} onChange={(e) => setNewPath(e.target.value)} placeholder={tr('путь (напр. pricing)')} className="h-8" />
                <Button size="sm" onClick={addPage} className="shrink-0 gap-1"><Plus className="h-4 w-4" /></Button>
              </div>
              {siteMeta && (
                <p className="text-xs text-muted-foreground">
                  {tr('Адрес:')} <span className="font-mono">/s/{siteMeta.slug}/{newPath.trim().replace(/^\/+|\/+$/g, '') || '…'}</span>
                </p>
              )}
            </div>
          </Card>
          </>)}

          {/* Current page settings */}
          {page && (
            <Card className="space-y-2 p-3">
              <p className="text-sm font-semibold">{isLanding ? tr('Лендинг') : tr('Страница')}</p>
              <Input value={page.title} onChange={(e) => renamePage('title', e.target.value)} placeholder={tr('Заголовок')} className="h-8" />
              {!isLanding && (
                <Input value={page.path} onChange={(e) => renamePage('path', e.target.value)} placeholder={tr('путь (пусто = главная)')} className="h-8" />
              )}
              {!isLanding && siteMeta && (
                <p className="text-xs text-muted-foreground">
                  {tr('Адрес:')} <span className="font-mono">/s/{siteMeta.slug}{page.path ? `/${page.path}` : ''}</span>
                </p>
              )}
              <Textarea value={page.description ?? ''} onChange={(e) => renamePage('description', e.target.value)} rows={2} placeholder={tr('SEO-описание (meta description)')} />
            </Card>
          )}
          </div>{/* end Страницы */}

          {/* TAB: Блоки — two columns as soon as the PANEL itself is wide
              enough (container query), not the viewport: with a wide preview
              pane the panel may be narrow even on a large monitor. */}
          <div className={tab === 'blocks' ? 'grid items-start gap-4 @3xl:grid-cols-2' : 'hidden'}>
          <div className="space-y-4">
          {/* Palette */}
          <Card className="p-3" data-tour="palette">
            <p className="mb-1 text-sm font-semibold">{tr('Добавить элемент')}</p>
            <p className="mb-2 text-xs text-muted-foreground">{selected && isContainer(selected.type) ? tr('Клик — внутрь: {label}').replace('{label}', tr(NODE_LABELS[selected.type])) : tr('Клик — в конец страницы')} · {tr('или перетащите на блок')}</p>
            <Input data-tour="palette-search" value={paletteQuery} onChange={(e) => setPaletteQuery(e.target.value)} placeholder={tr('Поиск элемента…')} className="mb-2 h-8" />
            {(() => {
              // Match against the LOCALIZED label — the user searches in the
              // language they see, not in the internal Russian keys.
              const q = paletteQuery.trim().toLowerCase();
              const found = PALETTE.filter((t) => tr(NODE_LABELS[t]).toLowerCase().includes(q) || NODE_LABELS[t].toLowerCase().includes(q));
              return found.length ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {found.map((t) => (
                    <Button key={t} size="sm" variant="outline" onMouseDown={(e) => startPaletteDrag(t, e)} title={tr(NODE_LABELS[t])} className="min-w-0 cursor-grab justify-start gap-1 px-2 text-xs active:cursor-grabbing">
                      <Plus className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{tr(NODE_LABELS[t])}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border p-2.5 text-center text-xs text-muted-foreground">{tr('Ничего не найдено.')}</p>
              );
            })()}
          </Card>

          {/* Section presets */}
          <Card className="p-3">
            <p className="mb-2 text-sm font-semibold">{tr('Готовые секции')}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SECTION_PRESETS.map((s) => (
                <Button key={s.id} size="sm" variant="outline" title={tplText(s.label, locale)} className="min-w-0 justify-start gap-1 px-2 text-xs" onClick={() => addSectionPreset(s.id)}>
                  <Plus className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{tplText(s.label, locale)}</span>
                </Button>
              ))}
            </div>
          </Card>

          {/* Tree */}
          <Card className="p-3" onDragOver={(e) => e.preventDefault()} onDrop={onRootDrop}>
            <p className="mb-1 text-sm font-semibold">{tr('Структура')}</p>
            <p className="mb-2 text-xs text-muted-foreground">{tr('Перетащите элемент из палитры сюда или на нужный блок.')}</p>
            {page && page.blocks.length > 0 && (
              <div className="relative mb-2">
                <input
                  value={treeQuery}
                  onChange={(e) => setTreeQuery(e.target.value)}
                  placeholder={tr('Поиск по блокам…')}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 pr-7 text-xs outline-none focus:border-primary"
                />
                {treeQuery && (
                  <button onClick={() => setTreeQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={tr('Очистить')}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            {page && page.blocks.length > 0 ? (
              <Tree nodes={page.blocks} depth={0} selectedId={selectedId} onSelect={setSelectedId} query={treeQuery}
                collapsed={collapsed} onToggle={toggleCollapse}
                dropHint={dropHint} setDropHint={setDropHint}
                onMove={(id, dir) => setBlocks((b) => moveNode(b, id, dir))}
                onDuplicate={duplicate}
                onDragStartId={(id) => { dragId.current = id; }}
                onDropRow={(id, pos) => { const dg = dragId.current; if (dg) setBlocks((b) => moveTo(b, dg, id, pos)); dragId.current = null; setDropHint(null); }}
                onDelete={(id) => { setBlocks((b) => removeNode(b, id)); if (selectedId === id) setSelectedId(null); }} />
            ) : (
              <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">{tr('Пусто — добавьте элемент из палитры.')}</p>
            )}
          </Card>
          </div>{/* col A */}

          {/* Properties */}
          <div className="space-y-4">
          <Card className="p-3">
            <p className="mb-2 text-sm font-semibold">{tr('Свойства')}</p>
            {selected ? (
              <div className="space-y-2.5">
                {page && (
                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    {ancestorPath(page.blocks, selected.id).map((a) => (
                      <span key={a.id} className="flex items-center gap-1">
                        <button className="hover:text-foreground" onClick={() => setSelectedId(a.id)}>{tr(NODE_LABELS[a.type as NodeType] ?? a.type)}</button>
                        <span>›</span>
                      </span>
                    ))}
                    <span className="font-medium text-foreground">{tr(NODE_LABELS[selected.type])}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
                  <button onClick={() => duplicate(selected.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={tr('Дублировать (Ctrl+D)')} aria-label={tr('Дублировать')}><CopyPlus className="h-4 w-4" /></button>
                  <button onClick={() => copyNode(selected.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={tr('Копировать (Ctrl+C)')} aria-label={tr('Копировать')}><Copy className="h-4 w-4" /></button>
                  <button onClick={pasteNode} disabled={!hasClip} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" title={tr('Вставить (Ctrl+V)')} aria-label={tr('Вставить')}><ClipboardPaste className="h-4 w-4" /></button>
                  <span className="mx-0.5 h-4 w-px bg-border" />
                  <button onClick={() => setBlocks((b) => moveNode(b, selected.id, -1))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={tr('Выше')} aria-label={tr('Выше')}><ArrowUp className="h-4 w-4" /></button>
                  <button onClick={() => setBlocks((b) => moveNode(b, selected.id, 1))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={tr('Ниже')} aria-label={tr('Ниже')}><ArrowDown className="h-4 w-4" /></button>
                  <span className="mx-0.5 h-4 w-px bg-border" />
                  <button onClick={() => deleteNode(selected.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-red-500" title={tr('Удалить (Delete)')} aria-label={tr('Удалить')}><Trash2 className="h-4 w-4" /></button>
                </div>
                {device !== 'mobile' && (
                  <div className="flex flex-wrap items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 p-1 text-[11px]">
                    <span className="px-1 font-medium text-primary">{tr('Правки для')}: {tr(IMG_DEVICE_LABEL[device])}</span>
                    <span className="mx-0.5 h-4 w-px bg-border" />
                    <button onClick={() => copyToBreakpoint(selected.id, device, selected.props)} className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={tr('Скопировать стили с меньшего экрана в этот')}>{tr('Скопировать с меньшего')}</button>
                    <button onClick={() => resetBreakpoint(selected.id, device)} className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={tr('Убрать все переопределения этого экрана (вернуть наследование)')}>{tr('Сбросить экран')}</button>
                  </div>
                )}
                {FIELDS[selected.type].length === 0 && <p className="text-xs text-muted-foreground">{tr('Нет настроек контента.')}</p>}
                {FIELDS[selected.type].map((f) => {
                  const responsive = !!f.opts && RESP_FIELD_KEYS.has(f.k);
                  const key = responsive ? respKey(f.k, device) : f.k;
                  const cur = responsive ? respValue(selected.props, f.k, device) : selected.props[f.k];
                  return (
                  <div key={f.k}>
                    <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      {tr(f.label)}
                      {responsive && device !== 'mobile' && (
                        <span className="rounded bg-primary/10 px-1 py-px text-[9px] font-semibold text-primary">{tr(IMG_DEVICE_LABEL[device])}</span>
                      )}
                      {responsive && device !== 'mobile' && selected.props[key] ? (
                        <button onClick={() => patch(selected.id, { [key]: '' })} title={tr('Своё значение для этого экрана — сбросить')} className="ml-auto h-2 w-2 rounded-full bg-primary" aria-label={tr('Сбросить это переопределение')} />
                      ) : null}
                    </label>
                    {f.opts ? (
                      <Select value={cur ?? f.opts[0]} onValueChange={(v) => patch(selected.id, { [key]: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{f.opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : f.kind === 'textarea' ? (
                      <Textarea value={selected.props[f.k] ?? ''} onChange={(e) => patch(selected.id, { [f.k]: e.target.value })} rows={3} />
                    ) : (
                      <Input value={selected.props[f.k] ?? ''} onChange={(e) => patch(selected.id, { [f.k]: e.target.value })} className="h-8" />
                    )}
                  </div>
                  );
                })}
                {selected.type === 'image' && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">{tr('Режим отображения')}</label>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{tr(IMG_DEVICE_LABEL[device])}</span>
                    </div>
                    <Select
                      value={effectiveImgMode(selected.props, device)}
                      onValueChange={(v) => patch(selected.id, { [IMG_MODE_KEY[device]]: v })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{IMG_MODE_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                      {tr('Переключай устройство сверху (моб./планшет/десктоп), чтобы задать свой режим для каждого экрана. «background» = фон на всю секцию, текст поверх.')}
                    </p>
                  </div>
                )}
                {selected.type === 'image' && (
                  <div className="space-y-2 border-t border-border/60 pt-2">
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {tr('Задайте разные картинки для светлой и тёмной темы — сайт покажет подходящую автоматически.')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Light theme image */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Sun className="h-3.5 w-3.5" /> {tr('Светлая тема')}</div>
                        {selected.props.src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selected.props.src} alt="" className="h-16 w-full rounded-md border border-border object-cover" />
                        ) : (
                          <div className="flex h-16 w-full items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">{tr('нет')}</div>
                        )}
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 px-1.5 text-[11px]" disabled={uploadBusy} onClick={() => uploadRef.current?.click()}>
                            {uploadBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {tr('Загрузить')}
                          </Button>
                          {selected.props.src && (
                            <button onClick={() => patch(selected.id, { src: '' })} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-500" title={tr('Удалить')} aria-label={tr('Удалить')}><X className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                        <input ref={uploadRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, selected.id, 'src'); e.target.value = ''; }} />
                      </div>
                      {/* Dark theme image */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Moon className="h-3.5 w-3.5" /> {tr('Тёмная тема')}</div>
                        {selected.props.srcDark ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selected.props.srcDark} alt="" className="h-16 w-full rounded-md border border-border object-cover" />
                        ) : (
                          <div className="flex h-16 w-full items-center justify-center rounded-md border border-dashed border-border text-center text-[10px] text-muted-foreground">{selected.props.src ? tr('как светлая') : tr('нет')}</div>
                        )}
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 px-1.5 text-[11px]" disabled={uploadBusy} onClick={() => uploadDarkRef.current?.click()}>
                            {uploadBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {tr('Загрузить')}
                          </Button>
                          {selected.props.srcDark && (
                            <button onClick={() => patch(selected.id, { srcDark: '' })} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-500" title={tr('Удалить')} aria-label={tr('Удалить')}><X className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                        <input ref={uploadDarkRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, selected.id, 'srcDark'); e.target.value = ''; }} />
                      </div>
                    </div>
                  </div>
                )}
                {selected.type === 'video' && (
                  <div className="border-t border-border/60 pt-2">
                    <Button size="sm" variant="outline" className="w-full gap-1.5" disabled={uploadBusy} onClick={() => videoUploadRef.current?.click()}>
                      {uploadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {tr('Загрузить видео')}
                    </Button>
                    <input
                      ref={videoUploadRef}
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, selected.id); e.target.value = ''; }}
                    />
                  </div>
                )}
                {selected.type === 'videoGrid' && (() => {
                  const rows = parseGridItems(selected.props.items);
                  const setRows = (next: GridItem[]) => patch(selected.id, { items: serializeGridItems(next) });
                  const setRow = (i: number, k: keyof GridItem, v: string) => setRows(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
                  return (
                  <div className="space-y-2 border-t border-border/60 pt-2">
                    <label className="text-xs font-medium text-muted-foreground">{tr('Свои медиа (фото и видео)')}</label>
                    {rows.length === 0 && (
                      <p className="rounded-lg border border-dashed border-border p-2.5 text-[11px] leading-snug text-muted-foreground">
                        {tr('Список пуст — сетка показывает ролики из Студии. Загрузите файлы или добавьте URL, чтобы заменить их.')}
                      </p>
                    )}
                    {rows.map((r, i) => (
                      <div key={i} className="space-y-1.5 rounded-lg border border-border/60 bg-muted/30 p-2">
                        <div className="flex items-center gap-2">
                          {!r.src ? (
                            <div className="h-9 w-14 shrink-0 rounded-md border border-dashed border-border bg-muted/40" />
                          ) : GRID_IMG_RE.test(r.src) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.src} alt="" className="h-9 w-14 shrink-0 rounded-md border border-border object-cover" />
                          ) : (
                            <video src={r.src} poster={r.poster || undefined} muted playsInline preload="metadata" className="h-9 w-14 shrink-0 rounded-md border border-border object-cover" />
                          )}
                          <Input value={r.src} onChange={(e) => setRow(i, 'src', e.target.value)} placeholder="URL" className="h-7 min-w-0 flex-1 text-[11px]" />
                          <button onClick={() => i > 0 && setRows(rows.map((x, idx) => (idx === i - 1 ? rows[i] : idx === i ? rows[i - 1] : x)))} disabled={i === 0} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" title={tr('Выше')} aria-label={tr('Выше')}><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button onClick={() => i < rows.length - 1 && setRows(rows.map((x, idx) => (idx === i + 1 ? rows[i] : idx === i ? rows[i + 1] : x)))} disabled={i === rows.length - 1} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" title={tr('Ниже')} aria-label={tr('Ниже')}><ArrowDown className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-500" title={tr('Удалить')} aria-label={tr('Удалить')}><X className="h-3.5 w-3.5" /></button>
                        </div>
                        <Input value={r.title} onChange={(e) => setRow(i, 'title', e.target.value)} placeholder="Заголовок" className="h-7 text-xs" />
                        <Input value={r.subtitle} onChange={(e) => setRow(i, 'subtitle', e.target.value)} placeholder="Подпись" className="h-7 text-xs" />
                        <div className="flex items-center gap-2">
                          <Moon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <Input value={r.srcDark} onChange={(e) => setRow(i, 'srcDark', e.target.value)} placeholder={tr('URL для тёмной темы (необязательно)')} className="h-7 min-w-0 flex-1 text-[11px]" />
                          <button onClick={() => { darkRowRef.current = i; gridDarkUploadRef.current?.click(); }} disabled={uploadBusy} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" title={tr('Загрузить для тёмной темы')} aria-label={tr('Загрузить для тёмной темы')}><Upload className="h-3.5 w-3.5" /></button>
                          {r.srcDark && <button onClick={() => setRow(i, 'srcDark', '')} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-500" title={tr('Удалить')} aria-label={tr('Удалить')}><X className="h-3.5 w-3.5" /></button>}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5" disabled={uploadBusy} onClick={() => gridUploadRef.current?.click()}>
                        {uploadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {tr('Загрузить фото/видео')}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setRows([...rows, { src: '', title: '', subtitle: '', poster: '', srcDark: '', posterDark: '' }])} title={tr('Добавить по URL')} aria-label={tr('Добавить по URL')}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <input
                      ref={gridUploadRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      hidden
                      onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) uploadGridMedia(fs, selected.id, selected.props.items ?? ''); e.target.value = ''; }}
                    />
                    <input
                      ref={gridDarkUploadRef}
                      type="file"
                      accept="image/*,video/*"
                      hidden
                      onChange={(e) => { const f = e.target.files?.[0]; if (f && darkRowRef.current >= 0) uploadGridItemDark(f, selected.id, rows, darkRowRef.current); e.target.value = ''; }}
                    />
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {tr('Можно выбрать сразу несколько файлов — каждый оптимизируется и добавится карточкой выше. Видео до 64 МБ.')}
                    </p>
                  </div>
                  );
                })()}

                {/* Advanced builder capabilities are Studio-only (monetization gate). */}
                {!builderUnlocked && (
                  <div className="mt-1 rounded-lg border border-primary/40 bg-primary/5 p-3">
                    <p className="text-xs font-semibold text-foreground">{tr('Продвинутый конструктор — на плане Studio')}</p>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {tr('Эффекты, анимации, hover-состояния, произвольный CSS, адаптивные стили и копирование стиля доступны на самом полном плане.')}
                    </p>
                    <a
                      href="/pricing"
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      {tr('Открыть все возможности')}
                    </a>
                  </div>
                )}

                {/* Copy / paste an element's whole style (feature 4) */}
                {builderUnlocked && (
                <div className="border-t border-border/60 pt-2.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={copyStyle}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card/60 px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      title={tr('Скопировать все стили этого элемента')}
                    >
                      <Copy className="h-3.5 w-3.5" /> {tr('Копировать стиль')}
                    </button>
                    <button
                      onClick={pasteStyle}
                      disabled={!copiedStyle}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card/60 px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      title={tr('Применить скопированные стили к этому элементу')}
                    >
                      <ClipboardPaste className="h-3.5 w-3.5" /> {tr('Вставить стиль')}
                    </button>
                  </div>
                </div>
                )}

                {/* One-click effect presets — apply a bundle of advanced styles */}
                {builderUnlocked && (() => {
                  const GROUPS: { kind: EffectPreset['kind']; title: string }[] = [
                    { kind: 'entrance', title: 'Появление' },
                    { kind: 'loop', title: 'Постоянные' },
                    { kind: 'hover', title: 'При наведении' },
                    { kind: 'style', title: 'Стили' },
                  ];
                  const isActive = (e: EffectPreset) => Object.entries(e.props).every(([k, v]) => (selected.props[k] ?? '') === v);
                  return (
                    <div className="border-t border-border/60 pt-2.5">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('Готовые эффекты')}</p>
                        <button
                          onClick={() => patch(selected.id, clearEffectPatch())}
                          className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        >
                          {tr('Сбросить')}
                        </button>
                      </div>
                      <style dangerouslySetInnerHTML={{ __html: FX_PREVIEW_CSS }} />
                      <div className="space-y-2">
                        {GROUPS.map((g) => {
                          const items = EFFECT_PRESETS.filter((e) => e.kind === g.kind);
                          if (!items.length) return null;
                          return (
                            <div key={g.kind}>
                              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">{tr(g.title)}</p>
                              <div className="grid grid-cols-3 gap-1.5">
                                {items.map((e) => {
                                  const active = isActive(e);
                                  return (
                                    <button
                                      key={e.id}
                                      onClick={() => patch(selected.id, applyEffectPatch(e.id))}
                                      title={`${tr(e.label)} — ${tr('Наведите, чтобы посмотреть')}`}
                                      className={cn(
                                        'fxgrp flex flex-col gap-1 rounded-md border p-1.5 text-[10px] font-medium leading-tight transition-colors',
                                        active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                                      )}
                                    >
                                      <span className="flex h-6 w-full items-center justify-center overflow-hidden rounded bg-muted/40">
                                        <span className={`fxp fxp-${e.id}`} />
                                      </span>
                                      <span className="line-clamp-1 text-center">{tr(e.label)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-[10px] leading-snug text-muted-foreground/70">
                        {tr('Клик применяет набор стилей; результат сразу виден в превью и дальше настраивается в блоках ниже.')}
                      </p>
                    </div>
                  );
                })()}

                {/* Styling for every element */}
                {builderUnlocked && STYLE_GROUPS.map((g) => (
                  <div key={g.title} className="border-t border-border/60 pt-2.5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr(g.title)}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {g.fields.map((f) => {
                        const isColor = f.k === 'textColor' || f.k === 'bgColor' || f.k === 'borderColor';
                        const responsive = RESP_KEYS.has(f.k);
                        const key = responsive ? respKey(f.k, device) : f.k;
                        const val = responsive ? respValue(selected.props, f.k, device) : selected.props[f.k];
                        return (
                          <div key={f.k}>
                            <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                              {tr(f.label)}
                              {responsive && device !== 'mobile' && (
                                <span className="rounded bg-primary/10 px-1 py-px text-[9px] font-semibold text-primary">{tr(IMG_DEVICE_LABEL[device])}</span>
                              )}
                              {responsive && device !== 'mobile' && selected.props[key] ? (
                                <button onClick={() => patch(selected.id, { [key]: '' })} title={tr('Своё значение для этого экрана — сбросить')} className="ml-auto h-2 w-2 rounded-full bg-primary" aria-label={tr('Сбросить это переопределение')} />
                              ) : null}
                            </label>
                            {f.opts ? (
                            <div className="flex gap-1">
                              <Select value={val && !val.startsWith('#') ? val : '—'} onValueChange={(v) => patch(selected.id, { [key]: v === '—' ? '' : v })}>
                                <SelectTrigger className="h-8 min-w-0 flex-1"><SelectValue placeholder={val?.startsWith('#') ? tr('свой') : undefined} /></SelectTrigger>
                                <SelectContent>{f.opts!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                              </Select>
                              {isColor && (
                                <ColorInput
                                  value={val?.startsWith('#') ? val : '#000000'}
                                  onCommit={(v) => { patch(selected.id, { [key]: v }); rememberColor(v); }}
                                  onPreview={(v) => sendColorHint(selected.id, f.k, v)}
                                  title={tr('Выбрать свой цвет')}
                                  className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                                />
                              )}
                            </div>
                            ) : f.kind === 'textarea' ? (
                              <Textarea value={selected.props[key] ?? ''} onChange={(e) => patch(selected.id, { [key]: e.target.value })} rows={2} className="min-h-0 font-mono text-[11px] leading-snug" />
                            ) : (
                              <Input value={val ?? ''} onChange={(e) => patch(selected.id, { [key]: e.target.value })} className="h-8" />
                            )}
                            {isColor && (hasEyeDropper || recentColors.length > 0) && (
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {hasEyeDropper && (
                                  <button
                                    onClick={() => pickFromScreen((v) => { patch(selected.id, { [key]: v }); rememberColor(v); })}
                                    title={tr('Взять цвет с экрана')}
                                    aria-label={tr('Взять цвет с экрана')}
                                    className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                                  >
                                    <Pipette className="h-3 w-3" />
                                  </button>
                                )}
                                {recentColors.map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => patch(selected.id, { [key]: c })}
                                    title={c}
                                    aria-label={c}
                                    className="h-4 w-4 shrink-0 rounded-full border border-border"
                                    style={{ background: c }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* Style presets (feature 3) */}
                <div className="border-t border-border/60 pt-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('Стиль-пресеты')}</p>
                    <button onClick={saveStylePreset} className="rounded-md border border-border px-2 py-0.5 text-[11px] hover:bg-muted">{tr('Сохранить стиль')}</button>
                  </div>
                  {stylePresets.length === 0 ? (
                    <p className="text-[11px] leading-snug text-muted-foreground">{tr('Сохраните стиль текущего элемента и применяйте к любым другим одним кликом.')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {stylePresets.map((ps) => (
                        <span key={ps.id} className="flex max-w-full items-center gap-1 rounded-md border border-border bg-muted/40 pl-2 text-[11px]">
                          <button onClick={() => applyStylePreset(ps)} className="max-w-40 truncate py-1 hover:text-primary" title={`${ps.name} — ${tr('Применить к выбранному элементу')}`}>{ps.name}</button>
                          <button onClick={() => deleteStylePreset(ps.id)} className="shrink-0 px-1 text-muted-foreground hover:text-red-500" aria-label={tr('Удалить пресет')}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Reusable blocks / symbols (feature 2) */}
                <div className="border-t border-border/60 pt-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr('Общие блоки')}</p>
                    {selected && !selected.props.symbolId && (
                      <button onClick={makeSymbol} className="rounded-md border border-border px-2 py-0.5 text-[11px] hover:bg-muted">{tr('Сделать общим')}</button>
                    )}
                  </div>
                  {selected?.props.symbolId ? (
                    <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-[11px]">
                      <span className="min-w-0 truncate text-primary" title={selected.props.symbolName || tr('без имени')}>🔗 {tr('Общий блок')}: {selected.props.symbolName || tr('без имени')}</span>
                      <button onClick={detachSymbol} className="shrink-0 text-muted-foreground hover:text-red-500" title={tr('Отвязать эту копию')}>{tr('Отвязать')}</button>
                    </div>
                  ) : null}
                  {symbolsMap.size === 0 ? (
                    <p className="text-[11px] leading-snug text-muted-foreground">{tr('Сделайте блок общим — и вставляйте его копии. Правка одной копии меняет все.')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {[...symbolsMap.entries()].map(([sid, name]) => (
                        <button key={sid} onClick={() => insertSymbolCopy(sid)} className="max-w-full truncate rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] hover:border-primary hover:text-primary" title={`${name} — ${tr('Вставить копию (в выбранный контейнер или в конец)')}`}>+ {name}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{tr('Выберите элемент в структуре, чтобы редактировать.')}</p>
            )}
          </Card>
          </div>{/* col B */}
          </div>{/* end Блоки */}

          {/* TAB: Сайт */}
          <div className={tab === 'design' ? 'space-y-4' : 'hidden'}>
          {/* The landing (/) keeps the platform header/footer — chrome settings
              (logo, header/footer variants, nav) do not apply and are hidden. */}
          {isLanding && (
            <Card className="border-primary/30 bg-primary/5 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold"><Home className="h-4 w-4 text-primary" /> {tr('Шапка и подвал платформы')}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{tr('Лендинг «/» использует фирменные шапку и подвал сайта — в конструкторе они не редактируются. Здесь настраиваются только секции между ними.')}</p>
            </Card>
          )}
          {!isLanding && (<>
          {/* Chrome variants */}
          <Card className="p-3">
            <p className="mb-2 text-sm font-semibold">{tr('Логотип')}</p>
            <div className="mb-2 flex gap-1.5">
              {(['text', 'logo', 'both'] as const).map((m) => (
                <Button key={m} size="sm" variant={(doc.brandMode || (doc.logoUrl ? 'both' : 'text')) === m ? 'default' : 'outline'} className="h-7 flex-1 text-xs" onClick={() => setDoc((d) => ({ ...d, brandMode: m }))}>
                  {m === 'text' ? tr('Текст') : m === 'logo' ? tr('Лого') : tr('Лого + текст')}
                </Button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input value={doc.logoUrl ?? ''} onChange={(e) => setDoc((d) => ({ ...d, logoUrl: e.target.value }))} placeholder={tr('URL логотипа')} className="h-8" />
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.currentTarget.value = ''; }} />
              <Button size="sm" variant="outline" className="shrink-0 gap-1" disabled={logoBusy} onClick={() => logoInputRef.current?.click()} title={tr('Загрузить логотип')}>
                {logoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
            </div>
            {doc.logoUrl && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{tr('Высота, px')}</label>
                  <Input value={doc.logoHeight ?? ''} onChange={(e) => setDoc((d) => ({ ...d, logoHeight: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="32" className="h-8" inputMode="numeric" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{tr('Макс. ширина, px')}</label>
                  <Input value={doc.logoWidth ?? ''} onChange={(e) => setDoc((d) => ({ ...d, logoWidth: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="120" className="h-8" inputMode="numeric" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{tr('Alt-текст (для доступности/SEO)')}</label>
                  <Input value={doc.logoAlt ?? ''} onChange={(e) => setDoc((d) => ({ ...d, logoAlt: e.target.value }))} placeholder={doc.brand} className="h-8" />
                </div>
                <Button size="sm" variant="ghost" className="col-span-2 h-7 text-xs text-muted-foreground hover:text-red-500" onClick={() => setDoc((d) => ({ ...d, logoUrl: '', brandMode: 'text' }))}>
                  {tr('Удалить логотип')}
                </Button>
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">{tr('Alt и размеры задаются автоматически, чтобы не было ошибок Lighthouse (CLS/доступность).')}</p>
          </Card>
          <Card className="p-3">
            <p className="mb-2 text-sm font-semibold">{tr('Шапка (header)')}</p>
            <div className="grid grid-cols-2 gap-2">
              {(['minimal', 'centered', 'split', 'cta'] as const).map((v) => (
                <div key={v} role="button" tabIndex={0} onClick={() => setDoc((d) => ({ ...d, headerVariant: v }))} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDoc((d) => ({ ...d, headerVariant: v })); }} className={`cursor-pointer overflow-hidden rounded-lg border p-1 text-left transition-colors ${(doc.headerVariant || 'minimal') === v ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50'}`}>
                  <ChromeThumb doc={doc} kind="header" variant={v} />
                  <span className="mt-1 block text-[11px] font-medium">{tr(HEADER_LABELS[v])}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">{tr('Поведение:')}</span>
              {(['solid', 'transparent'] as const).map((b) => (
                <Button key={b} size="sm" variant={(doc.headerBehavior || 'solid') === b ? 'default' : 'outline'} className="h-7 flex-1 text-xs" onClick={() => setDoc((d) => ({ ...d, headerBehavior: b }))}>
                  {b === 'solid' ? tr('Сплошная') : tr('Прозрачная')}
                </Button>
              ))}
            </div>
            <p className="mb-2 mt-3 text-sm font-semibold">{tr('Подвал (footer)')}</p>
            <div className="grid grid-cols-2 gap-2">
              {(['simple', 'columns', 'centered', 'newsletter'] as const).map((v) => (
                <div key={v} role="button" tabIndex={0} onClick={() => setDoc((d) => ({ ...d, footerVariant: v }))} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDoc((d) => ({ ...d, footerVariant: v })); }} className={`cursor-pointer overflow-hidden rounded-lg border p-1 text-left transition-colors ${(doc.footerVariant || 'simple') === v ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50'}`}>
                  <ChromeThumb doc={doc} kind="footer" variant={v} />
                  <span className="mt-1 block text-[11px] font-medium">{tr(FOOTER_LABELS[v])}</span>
                </div>
              ))}
            </div>
            <p className="mb-1 mt-3 text-sm font-semibold">{tr('Боковая панель (aside)')}</p>
            <div className="flex gap-1.5">
              {(['none', 'left', 'right'] as const).map((v) => (
                <Button key={v} size="sm" variant={(doc.asideVariant || 'none') === v ? 'default' : 'outline'} className="flex-1 text-xs" onClick={() => setDoc((d) => ({ ...d, asideVariant: v }))}>
                  {v === 'none' ? tr('Нет') : v === 'left' ? tr('Слева') : tr('Справа')}
                </Button>
              ))}
            </div>
            {(doc.asideVariant && doc.asideVariant !== 'none') && (
              <div className="mt-1.5 flex gap-1.5">
                {(['default', 'compact', 'icons'] as const).map((v) => (
                  <Button key={v} size="sm" variant={(doc.asideStyle || 'default') === v ? 'default' : 'outline'} className="flex-1 text-xs" onClick={() => setDoc((d) => ({ ...d, asideStyle: v }))}>
                    {v === 'default' ? tr('Обычный') : v === 'compact' ? tr('Компакт') : tr('Иконки')}
                  </Button>
                ))}
              </div>
            )}
          </Card>

          {/* Chrome buttons — style only. The hrefs of these built-in buttons
              (login/register/account, newsletter submit) are fixed by the
              platform and intentionally have no editor. */}
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{tr('Кнопки шапки и подвала')}</p>
              <Button
                size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs"
                title={tr('Применить стиль кнопок, рекомендованный для текущей темы')}
                onClick={() => setDoc((d) => ({ ...d, ...(THEME_BTN_PRESETS[d.themeId] ?? THEME_BTN_PRESETS['modern-clean']) }))}
              >
                <Palette className="h-3.5 w-3.5" /> {tr('Подобрать под тему')}
              </Button>
            </div>
            <p className="mb-2 mt-0.5 text-[11px] text-muted-foreground">{tr('Меняются только стили. Ссылки этих кнопок (вход, регистрация, кабинет, подписка) фиксированы и не редактируются.')}</p>
            {([
              { k: 'authLoginVariant', label: 'Кнопка «Войти»', def: 'outline' },
              { k: 'authCtaVariant', label: 'Кнопка «Регистрация» / «Кабинет»', def: 'default' },
            ] as const).map((b) => (
              <div key={b.k} className="mb-2">
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{tr(b.label)}</label>
                <div className="flex flex-wrap gap-1.5">
                  {CHROME_BTN_VARIANTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDoc((d) => ({ ...d, [b.k]: v }))}
                      className={cn(chromeBtnClass(v, 'sm', doc.authBtnRounded || 'full'), (doc[b.k] || b.def) === v && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}
                    >
                      {tr(CHROME_BTN_VARIANT_LABELS[v])}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{tr('Размер')}</label>
                <div className="flex gap-1.5">
                  {(['sm', 'md', 'lg'] as const).map((s) => (
                    <Button key={s} size="sm" variant={(doc.authBtnSize || 'sm') === s ? 'default' : 'outline'} className="h-7 flex-1 text-xs" onClick={() => setDoc((d) => ({ ...d, authBtnSize: s }))}>
                      {s === 'sm' ? 'S' : s === 'md' ? 'M' : 'L'}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{tr('Скругление')}</label>
                <div className="flex gap-1.5">
                  {(['full', 'lg', 'md'] as const).map((r) => (
                    <Button key={r} size="sm" variant={(doc.authBtnRounded || 'full') === r ? 'default' : 'outline'} className="h-7 flex-1 text-xs" onClick={() => setDoc((d) => ({ ...d, authBtnRounded: r }))}>
                      {tr(CHROME_BTN_ROUNDED_LABELS[r])}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            {(doc.headerVariant === 'cta') && (
              <div className="mb-2 border-t border-border/60 pt-2">
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{tr('CTA-кнопка в шапке')}</label>
                <div className="mb-1.5 flex gap-1.5">
                  <Input value={doc.headerCtaText ?? ''} onChange={(e) => setDoc((d) => ({ ...d, headerCtaText: e.target.value }))} placeholder={tr('Связаться')} className="h-8" />
                  <select
                    value={doc.headerCtaHref ?? ''}
                    onChange={(e) => setDoc((d) => ({ ...d, headerCtaHref: e.target.value }))}
                    className="h-8 w-32 shrink-0 truncate rounded-md border border-input bg-background px-1 text-xs"
                    title={tr('Ведёт на страницу')}
                    aria-label={tr('Ведёт на страницу')}
                  >
                    <option value="">{tr('Контакты (по умолчанию)')}</option>
                    {doc.pages.map((p) => (
                      <option key={p.id} value={p.path ? `/site/${p.path}` : '/site'}>
                        {p.title}{p.path ? ` (/${p.path})` : tr(' (главная)')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CHROME_BTN_VARIANTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDoc((d) => ({ ...d, headerCtaVariant: v }))}
                      className={cn(chromeBtnClass(v, 'sm', doc.authBtnRounded || 'full'), (doc.headerCtaVariant || 'default') === v && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}
                    >
                      {tr(CHROME_BTN_VARIANT_LABELS[v])}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {doc.footerVariant === 'newsletter' && (
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{tr('Кнопка подписки (подвал)')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {CHROME_BTN_VARIANTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDoc((d) => ({ ...d, footerBtnVariant: v }))}
                      className={cn(chromeBtnClass(v, 'sm', doc.authBtnRounded || 'lg'), (doc.footerBtnVariant || 'default') === v && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}
                    >
                      {tr(CHROME_BTN_VARIANT_LABELS[v])}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Navigation editor */}
          <Card className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">{tr('Меню (шапка)')}</p>
              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={addNavLink}><Plus className="h-3.5 w-3.5" /> {tr('Пункт')}</Button>
            </div>
            <div className="mb-2">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{tr('Стиль пунктов меню')}</label>
              <div className="flex gap-1.5">
                {NAV_STYLES.map((v) => (
                  <Button key={v} size="sm" variant={(doc.navStyle || 'pills') === v ? 'default' : 'outline'} className="h-7 flex-1 px-1 text-xs" onClick={() => setDoc((d) => ({ ...d, navStyle: v }))}>
                    {tr(NAV_STYLE_LABELS[v])}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              {doc.nav.map((l, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input value={l.label} onChange={(e) => setNavLink(i, 'label', e.target.value)} placeholder={tr('Текст')} className="h-8 min-w-0" />
                  <Input value={l.href} onChange={(e) => setNavLink(i, 'href', e.target.value)} placeholder="/site/..." className="h-8 min-w-0" />
                  <select
                    value={doc.pages.some((p) => (p.path ? `/site/${p.path}` : '/site') === l.href) ? l.href : ''}
                    onChange={(e) => { if (e.target.value) setNavLink(i, 'href', e.target.value); }}
                    className="h-8 w-24 shrink-0 truncate rounded-md border border-input bg-background px-1 text-xs"
                    title={tr('Связать со страницей сайта')}
                    aria-label={tr('Связать со страницей сайта')}
                  >
                    <option value="">{tr('Страница…')}</option>
                    {doc.pages.map((p) => (
                      <option key={p.id} value={p.path ? `/site/${p.path}` : '/site'}>
                        {p.title}{p.path ? ` (/${p.path})` : tr(' (главная)')}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => removeNavLink(i)} className="shrink-0 text-muted-foreground hover:text-red-500" aria-label={tr('Удалить')}><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-border/60 pt-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{tr('Текст футера')}</label>
              <Input value={doc.footer.text} onChange={(e) => setDoc((d) => ({ ...d, footer: { ...d.footer, text: e.target.value } }))} className="h-8" />
            </div>
          </Card>
          </>)}
          </div>{/* end Сайт */}
        </aside>

        {/* Resizable splitter (desktop only; the touch target extends 6px to
            each side so it's easy to grab without pixel-hunting) */}
        <div
          onPointerDown={startResize}
          className={cn(
            "relative hidden w-1.5 shrink-0 cursor-col-resize touch-none bg-border/60 transition-colors after:absolute after:inset-y-0 after:-left-1.5 after:-right-1.5 after:content-[''] hover:bg-primary/60",
            isResizing && 'bg-primary/60',
            !fullscreen && 'lg:block',
          )}
          title={tr('Потяните, чтобы изменить ширину')}
        />

        {/* Live preview canvas. Full-width below lg (mobileView toggle),
            fixed --pw width from lg up. */}
        <div
          className={cn(
            '@container',
            fullscreen
              ? 'fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col bg-background'
              : 'min-w-0 flex-1 flex-col bg-muted/20 lg:w-(--pw) lg:flex-none lg:shrink-0 lg:border-l lg:border-border/60',
            !fullscreen && (mobileView === 'panel' ? 'hidden lg:flex' : 'flex'),
          )}
          style={fullscreen ? undefined : ({ '--pw': `${previewWidth}px` } as CSSProperties)}
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-xs text-muted-foreground @lg:px-4">
            <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate" title={previewSrc}>{previewSrc}</span>
            <span className="hidden shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary @xl:inline">{tr('в реальном времени')}</span>
            <div className="flex shrink-0 items-center gap-1">
              <LanguageSwitcher />
              <button onClick={() => setPreviewDark((v) => !v)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted" title={tr('Светлая / тёмная тема предпросмотра')} aria-label={tr('Светлая / тёмная тема предпросмотра')}>
                {previewDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="hidden @2xl:inline">{previewDark ? tr('Светлая') : tr('Тёмная')}</span>
              </button>
              <button onClick={() => setPreviewKey((k) => k + 1)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted" title={tr('Перезагрузить')} aria-label={tr('Перезагрузить')}>
                <RotateCw className="h-4 w-4" />
                <span className="hidden @2xl:inline">{tr('Перезагрузить')}</span>
              </button>
              <button onClick={() => setFullscreen((f) => !f)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted" title={tr('Полноэкранный предпросмотр')} aria-label={tr('Полноэкранный предпросмотр')}>
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                <span className="hidden @2xl:inline">{fullscreen ? tr('Свернуть') : tr('На весь экран')}</span>
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2 @lg:p-4">
            <div className="mx-auto h-full transition-[width] duration-300" style={{ width: fullscreen ? DEVICE[device] : (device === 'full' ? '100%' : DEVICE[device]) }}>
              <div className="relative h-full w-full">
                <iframe
                  ref={previewRef}
                  key={previewKey}
                  src="/builder-preview"
                  title={tr('Предпросмотр')}
                  onLoad={postPreview}
                  className={cn('h-full w-full rounded-xl border border-border bg-background shadow-2xl', (dragType || isResizing) && 'pointer-events-none')}
                />
                {selectedId && selRect && !dragType && !isResizing && page && (
                  <div
                    className="pointer-events-auto absolute z-20 flex items-center gap-0.5 rounded-lg border border-border bg-background/95 p-0.5 shadow-xl backdrop-blur"
                    style={(() => {
                      const BAR_W = 240; // approx toolbar width incl. contrast chip
                      const flipBelow = selRect.top < 40; // no room above → drop below
                      const maxLeft = selRect.vw ? Math.max(6, selRect.vw - BAR_W) : 100000;
                      return {
                        top: flipBelow ? selRect.top + selRect.height + 6 : selRect.top - 6,
                        left: Math.min(Math.max(6, selRect.left), maxLeft),
                        transform: flipBelow ? 'none' : 'translateY(-100%)',
                      };
                    })()}
                  >
                    <button
                      onClick={() => { const anc = ancestorPath(page.blocks, selectedId); const par = anc[anc.length - 1]; if (par) setSelectedId(par.id); }}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title={tr('Выбрать родителя')} aria-label={tr('Выбрать родителя')}
                    ><CornerLeftUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setBlocks((b) => moveNode(b, selectedId, -1))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={tr('Вверх')} aria-label={tr('Вверх')}><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setBlocks((b) => moveNode(b, selectedId, 1))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={tr('Вниз')} aria-label={tr('Вниз')}><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button onClick={() => duplicate(selectedId)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={tr('Дублировать')} aria-label={tr('Дублировать')}><Copy className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { setBlocks((b) => removeNode(b, selectedId)); setSelectedId(null); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500" title={tr('Удалить')} aria-label={tr('Удалить')}><Trash2 className="h-3.5 w-3.5" /></button>
                    {(() => {
                      if (!selColors?.hasText || !selColors.color || !selColors.bg) return null;
                      const ratio = contrastRatio(selColors.color, selColors.bg);
                      if (ratio == null) return null;
                      const lvl = wcagLevel(ratio);
                      const cls = lvl === 'fail' ? 'bg-red-500/15 text-red-500' : lvl === 'AA-large' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-green-500/15 text-green-600 dark:text-green-400';
                      return (
                        <span className={`ml-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold tabular-nums ${cls}`} title={tr('Контраст текста и фона (WCAG)')}>
                          {ratio.toFixed(1)}:1 {lvl === 'fail' ? '⚠' : lvl === 'AA-large' ? 'AA↓' : lvl}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {dragType && ghost && (
        <div
          className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2 rounded-md border border-primary bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-lg"
          style={{ left: ghost.x, top: ghost.y }}
        >
          {NODE_LABELS[dragType] ?? dragType}
        </div>
      )}
      <TourLauncher tour="studio-builder" />
    </main>
  );
}

// Real, theme-scoped mini-preview of a header/footer variant.
const HEADER_LABELS: Record<string, string> = { minimal: 'Минимал', centered: 'По центру', split: 'Сплит', cta: 'С кнопкой' };
const FOOTER_LABELS: Record<string, string> = { simple: 'Простой', columns: 'Колонки', centered: 'По центру', newsletter: 'С подпиской' };
// Every doc field the chrome (header/footer/aside) actually reads. The memo
// below re-renders a thumb only when one of these changes — editing page
// content must not redraw 8 mini-chromes on each keystroke.
const CHROME_DOC_KEYS = [
  'themeId', 'brand', 'brandMode', 'logoUrl', 'logoHeight', 'logoWidth', 'logoAlt',
  'nav', 'navStyle', 'footer', 'pages', 'base', 'siteId', 'authButtons',
  'authLoginVariant', 'authCtaVariant', 'authBtnSize', 'authBtnRounded', 'footerBtnVariant',
  'headerCtaText', 'headerCtaHref', 'headerCtaVariant', 'headerVariant', 'headerBehavior',
  'footerVariant', 'asideVariant', 'asideStyle',
] as const;
const chromeThumbEq = (
  a: { doc: BuilderDoc; kind: string; variant: string },
  b: { doc: BuilderDoc; kind: string; variant: string },
) =>
  a.kind === b.kind && a.variant === b.variant &&
  CHROME_DOC_KEYS.every((k) => (a.doc as unknown as Record<string, unknown>)[k] === (b.doc as unknown as Record<string, unknown>)[k]);
const ChromeThumb = memo(function ChromeThumb({ doc, kind, variant }: { doc: BuilderDoc; kind: 'header' | 'footer'; variant: string }) {
  const theme = getTheme(doc.themeId ?? 'modern-clean');
  const cls = `cthumb-${kind}-${variant}`;
  const css = useMemo(() => themeCss(theme).split(':root').join(`.${cls}`).split('.dark').join(`.${cls}`), [theme, cls]);
  const previewDoc = { ...doc, headerVariant: variant, headerBehavior: 'solid', footerVariant: variant } as BuilderDoc;
  const h = kind === 'header' ? 46 : 84;
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.33);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 1000);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full overflow-hidden rounded-md border border-border/60" style={{ height: h }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className={`${cls} pointer-events-none absolute left-0 top-0 origin-top-left`} style={{ width: 1000, transform: `scale(${scale})`, background: 'var(--background)', color: 'var(--foreground)' }}>
        <RevealDisabled.Provider value={true}>
          {kind === 'header' ? <ChromeHeader doc={previewDoc} /> : <ChromeFooter doc={previewDoc} />}
        </RevealDisabled.Provider>
      </div>
    </div>
  );
}, chromeThumbEq);

// Real, theme-scoped mini-preview of a landing (scaled-down actual render).
// Memoized: `def` is a module constant, so these full-page renders happen
// exactly once instead of on every editor state change.
const LandingThumb = memo(function LandingThumb({ def }: { def: { id: string; themeId?: string; build: () => { blocks: BuilderNode[] } } }) {
  const theme = getTheme(def.themeId ?? 'modern-clean');
  const blocks = useMemo(() => def.build().blocks, [def]);
  const cls = `thumb-${def.id}`;
  const css = useMemo(() => themeCss(theme).split(':root').join(`.${cls}`).split('.dark').join(`.${cls}`), [theme, cls]);
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const mounted = useMounted();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 1280);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted]);
  return (
    <div ref={ref} className="relative h-40 w-full overflow-hidden border-b border-border bg-background">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {mounted && (
      <div
        className={`${cls} pointer-events-none absolute left-0 top-0 origin-top-left`}
        style={{ width: 1280, transform: `scale(${scale})`, background: 'var(--background)', color: 'var(--foreground)' }}
      >
        <RevealDisabled.Provider value={true}>
          {blocks.map((n) => (
            <RenderNode key={n.id} node={n} />
          ))}
        </RevealDisabled.Provider>
      </div>
      )}
    </div>
  );
});

// Recursive tree view
function Tree({
  nodes, depth, selectedId, onSelect, onMove, onDelete, onDuplicate, onDragStartId, onDropRow,
  collapsed, onToggle, dropHint, setDropHint, query,
}: {
  nodes: BuilderNode[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDragStartId: (id: string) => void;
  onDropRow: (id: string, pos: 'before' | 'after') => void;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  dropHint: { id: string; pos: 'before' | 'after' } | null;
  setDropHint: (h: { id: string; pos: 'before' | 'after' } | null) => void;
  query?: string;
}) {
  const tr = builderTr(useLocale().locale);
  const q = (query ?? '').trim().toLowerCase();
  const matchesNode = (n: BuilderNode): boolean => {
    if (!q) return true;
    const label = tr(NODE_LABELS[n.type]).toLowerCase();
    const text = (n.props.text ?? '').toLowerCase();
    if (label.includes(q) || text.includes(q) || n.type.toLowerCase().includes(q)) return true;
    return (n.children ?? []).some(matchesNode);
  };
  return (
    <div className="space-y-1">
      {nodes.map((n, i) => {
        const hasKids = !!n.children && n.children.length > 0;
        const isCollapsed = collapsed.has(n.id);
        const container = isContainer(n.type);
        const hint = dropHint?.id === n.id ? dropHint.pos : null;
        if (q && !matchesNode(n)) return null;
        const selfMatch = q ? (tr(NODE_LABELS[n.type]).toLowerCase().includes(q) || (n.props.text ?? '').toLowerCase().includes(q) || n.type.toLowerCase().includes(q)) : false;
        return (
          <div key={n.id}>
            {hint === 'before' && <div className="my-0.5 h-0.5 rounded bg-primary" style={{ marginLeft: depth * 12 + 6 }} />}
            <div
              draggable
              data-tree-nid={n.id}
              data-tree-container={container ? '1' : undefined}
              onDragStart={(e) => { e.stopPropagation(); onDragStartId(n.id); }}
              onDragOver={(e) => {
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                setDropHint({ id: n.id, pos: e.clientY < r.top + r.height / 2 ? 'before' : 'after' });
              }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropRow(n.id, dropHint?.id === n.id ? dropHint.pos : 'after'); }}
              className={`flex items-center gap-0.5 rounded-md py-1 pr-1 text-sm ${selectedId === n.id ? 'bg-primary/15' : 'hover:bg-muted'}`}
              style={{ paddingLeft: depth * 12 + 2 }}
            >
              {container && hasKids ? (
                <button onClick={() => onToggle(n.id)} className="text-muted-foreground hover:text-foreground" aria-label={isCollapsed ? tr('Развернуть') : tr('Свернуть')}>
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <span className="w-3.5" />
              )}
              <span className="cursor-grab text-muted-foreground/50 active:cursor-grabbing" aria-hidden>⋮⋮</span>
              <button className={`min-w-0 flex-1 truncate text-left ${selfMatch ? 'font-semibold text-primary' : ''}`} onClick={() => onSelect(n.id)}>
                {tr(NODE_LABELS[n.type])}
                {n.props.text ? <span className="text-muted-foreground"> — {n.props.text.slice(0, 16)}</span> : null}
              </button>
              <button onClick={() => onMove(n.id, -1)} disabled={i === 0} className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label={tr('Вверх')}><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => onMove(n.id, 1)} disabled={i === nodes.length - 1} className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label={tr('Вниз')}><ArrowDown className="h-3.5 w-3.5" /></button>
              <button onClick={() => onDuplicate(n.id)} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label={tr('Дублировать')}><Copy className="h-3.5 w-3.5" /></button>
              <button onClick={() => onDelete(n.id)} className="shrink-0 text-muted-foreground hover:text-red-500" aria-label={tr('Удалить')}><X className="h-3.5 w-3.5" /></button>
            </div>
            {hint === 'after' && <div className="my-0.5 h-0.5 rounded bg-primary" style={{ marginLeft: depth * 12 + 6 }} />}
            {hasKids && (!isCollapsed || !!q) && (
              <Tree nodes={n.children!} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onMove={onMove} onDelete={onDelete} onDuplicate={onDuplicate} onDragStartId={onDragStartId} onDropRow={onDropRow} collapsed={collapsed} onToggle={onToggle} dropHint={dropHint} setDropHint={setDropHint} query={query} />
            )}
          </div>
        );
      })}
    </div>
  );
}
