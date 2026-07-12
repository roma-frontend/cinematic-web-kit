import { describe, it, expect } from 'vitest';
import { buildAssistantPrompt } from '@/lib/assistant-prompt';

describe('buildAssistantPrompt', () => {
  it('identifies itself as Studio Assistant', () => {
    const prompt = buildAssistantPrompt('en', 'customer');
    expect(prompt).toContain('Studio Assistant');
    expect(prompt).toContain('Builder Studio');
  });

  it('mentions the user name when provided', () => {
    const prompt = buildAssistantPrompt('en', 'customer', 'Alice');
    expect(prompt).toContain("The user's name is Alice.");
  });

  it('restricts routes to the role allow-list', () => {
    const customer = buildAssistantPrompt('en', 'customer');
    expect(customer).toContain('/dashboard/sites');
    expect(customer).not.toContain('/dashboard/users');
    expect(customer).not.toContain('/dashboard/super');

    const admin = buildAssistantPrompt('en', 'admin');
    expect(admin).toContain('/dashboard/users');
    expect(admin).not.toContain('/dashboard/super');

    const superadmin = buildAssistantPrompt('en', 'superadmin');
    expect(superadmin).toContain('/dashboard/super');
    expect(superadmin).toContain('/studio');
  });

  it('includes action instructions only when actions are allowed', () => {
    const withActions = buildAssistantPrompt('en', 'customer', undefined, true);
    expect(withActions).toContain('<ACTION');
    expect(withActions).toContain('create_site');

    const withoutActions = buildAssistantPrompt('en', 'customer', undefined, false);
    expect(withoutActions).not.toContain('<ACTION');
    expect(withoutActions).toContain('CANNOT fetch');
  });

  it('drops data keys when allowActions is false', () => {
    const withActions = buildAssistantPrompt('en', 'admin', undefined, true);
    expect(withActions).toContain('my-sites');
    expect(withActions).toContain('<DATA>key</DATA>');

    const withoutActions = buildAssistantPrompt('en', 'admin', undefined, false);
    expect(withoutActions).not.toContain('<DATA>key</DATA>');
    expect(withoutActions).toContain('NEVER emit a <DATA>');
  });

  it('injects memories when provided', () => {
    const prompt = buildAssistantPrompt('en', 'customer', undefined, true, ['Runs a coffee shop', 'Likes short answers']);
    expect(prompt).toContain('Runs a coffee shop');
    expect(prompt).toContain('Likes short answers');
  });

  it('injects the knowledge section when provided', () => {
    const knowledge = 'KNOWLEDGE BASE\nConfigure DNS.';
    const prompt = buildAssistantPrompt('en', 'superadmin', undefined, true, [], knowledge);
    expect(prompt).toContain('KNOWLEDGE BASE');
    expect(prompt).toContain('Configure DNS.');
  });

  it('uses the requested language line', () => {
    const ru = buildAssistantPrompt('ru', 'customer');
    expect(ru).toContain('ЯЗЫК:');
    expect(ru).toContain('русском');

    const hy = buildAssistantPrompt('hy', 'customer');
    expect(hy).toContain('ԼԵԶՈՒ:');
  });

  it('adds the memory recording instruction', () => {
    const prompt = buildAssistantPrompt('en', 'customer');
    expect(prompt).toContain('<REMEMBER>');
    expect(prompt).toContain('at most 2');
  });

  it('falls back to English for an unsupported locale', () => {
    // @ts-expect-error intentional bad locale
    const prompt = buildAssistantPrompt('zz', 'customer');
    expect(prompt).toContain('LANGUAGE:');
  });
});
