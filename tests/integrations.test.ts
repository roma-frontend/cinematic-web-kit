import { describe, it, expect, afterEach } from 'vitest';

// Covers the env-gated free-integration helpers. They all short-circuit without
// configuration (no network), so these tests are hermetic and fast.

describe('lib/llm', () => {
  const KEYS = ['LLM_URL', 'LLM_KEY', 'LLM_MODEL', 'THEME_LLM_URL', 'THEME_LLM_KEY', 'THEME_LLM_MODEL'];
  afterEach(() => KEYS.forEach((k) => delete process.env[k]));

  it('llmConfigured is false without url+key', async () => {
    const { llmConfigured } = await import('@/lib/llm');
    expect(llmConfigured()).toBe(false);
  });

  it('llmConfigured is true when configured (alias vars)', async () => {
    process.env.LLM_URL = 'https://example.com/v1/chat/completions';
    process.env.LLM_KEY = 'k';
    const { llmConfigured } = await import('@/lib/llm');
    expect(llmConfigured()).toBe(true);
  });

  it('chatComplete returns null when unconfigured (no network)', async () => {
    const { chatComplete } = await import('@/lib/llm');
    expect(await chatComplete([{ role: 'user', content: 'hi' }])).toBeNull();
  });

  it('llmConfig echoes env with a default model', async () => {
    process.env.LLM_URL = 'https://api.groq.com/openai/v1/chat/completions';
    process.env.LLM_KEY = 'gsk_test';
    const { llmConfig } = await import('@/lib/llm');
    const c = llmConfig();
    expect(c.url).toContain('groq.com');
    expect(c.key).toBe('gsk_test');
    expect(c.model).toBeTruthy();
  });
});

describe('lib/assistant-prompt', () => {
  it('builds a role-scoped, localized prompt with a nav allow-list', async () => {
    const { buildAssistantPrompt, assistantRoutesForRole, ASSISTANT_ROUTES } = await import('@/lib/assistant-prompt');
    expect(ASSISTANT_ROUTES).toContain('/presets');

    const ru = buildAssistantPrompt('ru', 'customer', 'Roman');
    expect(ru).toContain('Roman');
    expect(ru).toContain('русск'); // Russian language instruction
    expect(ru).toContain('CUSTOMER');
    expect(ru).toContain('/studio/builder');

    const en = buildAssistantPrompt('en', 'admin');
    expect(en).toContain('English');
    expect(en).toContain('ADMIN');
  });

  it('gates navigable routes by role', async () => {
    const { assistantRoutesForRole } = await import('@/lib/assistant-prompt');
    const customer = assistantRoutesForRole('customer');
    const admin = assistantRoutesForRole('admin');
    const superadmin = assistantRoutesForRole('superadmin');

    // Customers cannot reach staff/admin areas or the studio gallery.
    expect(customer).not.toContain('/dashboard/users');
    expect(customer).not.toContain('/studio');
    expect(customer).toContain('/studio/builder');
    // Admins get staff tools but not superadmin-only areas.
    expect(admin).toContain('/dashboard/users');
    expect(admin).not.toContain('/dashboard/database');
    // Superadmin gets everything.
    expect(superadmin).toContain('/dashboard/database');
    expect(superadmin).toContain('/studio');
  });

  it('gates fetchable data sets by role', async () => {
    const { assistantDataForRole } = await import('@/lib/assistant-routes');
    // Customers may only ever fetch their own sites.
    expect(assistantDataForRole('customer')).toEqual(['my-sites']);
    // Staff/owners can also list users and all sites.
    expect(assistantDataForRole('admin')).toContain('users');
    expect(assistantDataForRole('admin')).toContain('all-sites');
    expect(assistantDataForRole('superadmin')).toContain('users');
    // No role is offered data outside its allow-list.
    expect(assistantDataForRole('customer')).not.toContain('users');
  });
});

describe('lib/turnstile', () => {
  afterEach(() => delete process.env.TURNSTILE_SECRET_KEY);

  it('turnstileEnabled reflects the secret', async () => {
    const { turnstileEnabled } = await import('@/lib/turnstile');
    expect(turnstileEnabled()).toBe(false);
    process.env.TURNSTILE_SECRET_KEY = 's';
    expect(turnstileEnabled()).toBe(true);
  });

  it('verifyTurnstile fails open when not configured', async () => {
    const { verifyTurnstile } = await import('@/lib/turnstile');
    expect(await verifyTurnstile(undefined)).toBe(true);
    expect(await verifyTurnstile('anything')).toBe(true);
  });

  it('verifyTurnstile rejects a missing token when configured', async () => {
    process.env.TURNSTILE_SECRET_KEY = 's';
    const { verifyTurnstile } = await import('@/lib/turnstile');
    expect(await verifyTurnstile('')).toBe(false);
  });
});

describe('lib/workers-ai', () => {
  afterEach(() => {
    delete process.env.CF_AI_TOKEN;
    delete process.env.CF_ACCOUNT_ID;
  });

  it('workersAiConfigured needs account id + token', async () => {
    const { workersAiConfigured } = await import('@/lib/workers-ai');
    expect(workersAiConfigured()).toBe(false);
    process.env.CF_ACCOUNT_ID = 'a';
    process.env.CF_AI_TOKEN = 't';
    expect(workersAiConfigured()).toBe(true);
  });

  it('embed / edgeChat return null when unconfigured (no network)', async () => {
    const { embed, edgeChat } = await import('@/lib/workers-ai');
    expect(await embed('hi')).toBeNull();
    expect(await edgeChat([{ role: 'user', content: 'hi' }])).toBeNull();
  });

  it('cosineSimilarity: identical=1, orthogonal=0, zero-vector=0', async () => {
    const { cosineSimilarity } = await import('@/lib/workers-ai');
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('lib/realtime', () => {
  it('publishSubmission reaches a subscriber, then unsubscribe stops it', async () => {
    const { publishSubmission, onSubmission } = await import('@/lib/realtime');
    const seen: string[] = [];
    const off = onSubmission((e) => seen.push(e.siteId));
    publishSubmission({ siteId: 's1', formId: 'contact', at: new Date().toISOString() });
    off();
    publishSubmission({ siteId: 's2', formId: 'contact', at: new Date().toISOString() });
    expect(seen).toEqual(['s1']);
  });
});

describe('lib/seo contact helpers', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_CONTACT_DOMAIN;
    delete process.env.EMAIL_FROM;
  });

  it('contactDomain: null without config, explicit override wins', async () => {
    const { contactDomain, contactEmails } = await import('@/lib/seo');
    // Test env has no custom domain / EMAIL_FROM → null.
    expect(contactDomain()).toBeNull();
    expect(contactEmails()).toBeNull();

    process.env.NEXT_PUBLIC_CONTACT_DOMAIN = 'https://Acme.com/';
    expect(contactDomain()).toBe('acme.com'); // normalized (scheme/path/case stripped)
    expect(contactEmails()).toEqual({
      info: 'info@acme.com',
      support: 'support@acme.com',
      sales: 'sales@acme.com',
    });
  });

  it('contactDomain derives from EMAIL_FROM, ignoring resend.dev sandbox', async () => {
    const { contactDomain } = await import('@/lib/seo');
    process.env.EMAIL_FROM = 'onboarding@resend.dev';
    expect(contactDomain()).toBeNull();
    process.env.EMAIL_FROM = 'info@brand.io';
    expect(contactDomain()).toBe('brand.io');
  });
});
