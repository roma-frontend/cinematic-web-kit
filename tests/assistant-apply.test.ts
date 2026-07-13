import { describe, it, expect, beforeEach, vi } from 'vitest';
import { classifyInstruction, safeSelectedBlockContext } from '@/lib/assistant-apply';
import { chatComplete } from '@/lib/llm';

vi.mock('@/lib/llm', () => ({ chatComplete: vi.fn() }));

const chatCompleteMock = vi.mocked(chatComplete);

describe('classifyInstruction', () => {
  beforeEach(() => {
    chatCompleteMock.mockReset();
  });

  it('removes sensitive properties from selected-block context', () => {
    expect(safeSelectedBlockContext({
      type: 'button',
      props: { text: 'Buy', href: '/checkout', webhook: 'https://example.test', customCss: 'color:red' },
    })).toEqual({ type: 'button', props: { text: 'Buy' } });
  });

  it('bounds selected-block context values before sending them to the model', () => {
    const props = Object.fromEntries(Array.from({ length: 45 }, (_, index) => [`prop${index}`, 'x'.repeat(2000)]));
    const context = safeSelectedBlockContext({ type: 'heading', props });
    expect(Object.keys(context?.props ?? {})).toHaveLength(40);
    expect(context?.props.prop0).toHaveLength(1500);
  });

  it('returns a theme action from a valid LLM JSON reply', async () => {
    chatCompleteMock.mockResolvedValue('{"kind":"theme","themeId":"neon-night"}');
    const action = await classifyInstruction('make it neon night', 'en');
    expect(action.kind).toBe('theme');
    expect(action).toMatchObject({ kind: 'theme', themeId: 'neon-night', label: 'Neon Night' });
  });

  it('falls back to keyword matching when LLM returns null', async () => {
    chatCompleteMock.mockResolvedValue(null);
    const action = await classifyInstruction('cozy coffee shop theme', 'en');
    expect(action.kind).toBe('theme');
    if (action.kind !== 'theme') throw new Error('expected theme action');
    expect(action.themeId).toBe('editorial-coffee');
  });

  it('falls back to regeneration keyword', async () => {
    chatCompleteMock.mockResolvedValue(null);
    const action = await classifyInstruction('перепиши страницу под барбершоп', 'ru');
    expect(action).toEqual({ kind: 'regenerate' });
  });

  it('falls back to chat nudge for an off-topic instruction', async () => {
    chatCompleteMock.mockResolvedValue(null);
    const action = await classifyInstruction('what is the weather today', 'en');
    expect(action.kind).toBe('chat');
    if (action.kind !== 'chat') throw new Error('expected chat action');
    expect(action.message).toContain('theme');
  });

  it('localises the chat fallback', async () => {
    chatCompleteMock.mockResolvedValue(null);
    const ru = await classifyInstruction('что такое квантовая физика', 'ru');
    expect(ru.kind).toBe('chat');
    if (ru.kind !== 'chat') throw new Error('expected chat action');
    expect(ru.message.toLowerCase()).toContain('сменить тему');

    const hy = await classifyInstruction('ինչ է ծրագրավորումը', 'hy');
    expect(hy.kind).toBe('chat');
    if (hy.kind !== 'chat') throw new Error('expected chat action');
    expect(hy.message.length).toBeGreaterThan(10);
  });

  it('sanitizes an invalid theme id from the LLM', async () => {
    chatCompleteMock.mockResolvedValue('{"kind":"theme","themeId":"unknown-theme"}');
    const action = await classifyInstruction('luxury dark style', 'en');
    expect(action.kind).toBe('theme');
    if (action.kind !== 'theme') throw new Error('expected theme action');
    expect(action.themeId).toBe('luxury-dark');
  });

  it('parses JSON wrapped in prose from the LLM', async () => {
    chatCompleteMock.mockResolvedValue('Sure! Here is the action: {"kind":"theme","themeId":"tech-saas"}');
    const action = await classifyInstruction('make it look like a SaaS', 'en');
    if (action.kind !== 'theme') throw new Error('expected theme action');
    expect(action.themeId).toBe('tech-saas');
  });

  it('caps a chat message from the LLM', async () => {
    const long = 'a'.repeat(1000);
    chatCompleteMock.mockResolvedValue(`{"kind":"chat","message":"${long}"}`);
    const action = await classifyInstruction('explain everything', 'en');
    expect(action.kind).toBe('chat');
    if (action.kind !== 'chat') throw new Error('expected chat action');
    expect(action.message.length).toBeLessThanOrEqual(600);
  });

  it('falls back to keyword theme when LLM replies with malformed JSON', async () => {
    chatCompleteMock.mockResolvedValue('<not json>');
    const action = await classifyInstruction('dark neon party', 'en');
    expect(action.kind).toBe('theme');
    if (action.kind !== 'theme') throw new Error('expected theme action');
    expect(action.themeId).toBe('neon-night');
  });

  it('allows a selected-block patch only for existing changed properties', async () => {
    chatCompleteMock.mockResolvedValue('{"kind":"patch","changes":{"text":"New headline","href":"https://bad.example","customCss":"color:red"},"summary":"Rewrite heading"}');
    const action = await classifyInstruction('rewrite this heading', 'en', {
      type: 'heading',
      props: { text: 'Old headline', level: '2', href: '/safe', customCss: '' },
    });
    expect(action).toEqual({ kind: 'patch', changes: { text: 'New headline' }, summary: 'Rewrite heading' });
  });

  it('drops selected-block patch values that do not change', async () => {
    chatCompleteMock.mockResolvedValue('{"kind":"patch","changes":{"text":"Same","level":"2"}}');
    const action = await classifyInstruction('change this', 'en', {
      type: 'heading',
      props: { text: 'Same', level: '2' },
    });
    expect(action.kind).toBe('chat');
  });

  it('shortens selected text locally when the LLM is unavailable', async () => {
    chatCompleteMock.mockResolvedValue(null);
    const action = await classifyInstruction('сократи текст', 'ru', {
      type: 'text',
      props: { text: 'Раз два три четыре пять шесть' },
    });
    expect(action).toEqual({ kind: 'patch', changes: { text: 'Раз два три' }, summary: 'Сокращу текст выбранного блока' });
  });

  it('centers a selected block locally when the LLM is unavailable', async () => {
    chatCompleteMock.mockResolvedValue(null);
    const action = await classifyInstruction('выровняй по центру', 'ru', {
      type: 'heading',
      props: { text: 'Заголовок', align: 'left' },
    });
    expect(action).toEqual({ kind: 'patch', changes: { align: 'center' }, summary: 'Выровняю выбранный блок по центру' });
  });

  it('strengthens a selected CTA locally when the LLM is unavailable', async () => {
    chatCompleteMock.mockResolvedValue(null);
    const action = await classifyInstruction('усиль CTA', 'ru', {
      type: 'button',
      props: { text: 'Узнать' },
    });
    expect(action).toEqual({ kind: 'patch', changes: { text: 'Начать сейчас' }, summary: 'Сделаю призыв к действию более заметным' });
  });

  it('localises the CTA fallback to the selected locale', async () => {
    chatCompleteMock.mockResolvedValue(null);
    const action = await classifyInstruction('make CTA stronger', 'en', {
      type: 'button',
      props: { text: 'Learn more' },
    });
    expect(action).toEqual({ kind: 'patch', changes: { text: 'Get started' }, summary: 'Make the call to action more prominent' });
  });
});
