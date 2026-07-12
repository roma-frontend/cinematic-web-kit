import { describe, it, expect, beforeEach, vi } from 'vitest';
import { classifyInstruction } from '@/lib/assistant-apply';
import { chatComplete } from '@/lib/llm';

vi.mock('@/lib/llm', () => ({ chatComplete: vi.fn() }));

const chatCompleteMock = vi.mocked(chatComplete);

describe('classifyInstruction', () => {
  beforeEach(() => {
    chatCompleteMock.mockReset();
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
});
