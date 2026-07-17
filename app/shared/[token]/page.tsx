import { notFound } from 'next/navigation';
import { getRawDb } from '@/lib/db';
import { AssistantMarkdown } from '@/components/assistant/assistant-markdown';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SharedConversationPageProps {
  params: Promise<{ token: string }>;
}

async function getSharedConversation(token: string) {
  const db = getRawDb();

  const conversation = db.prepare(`
    SELECT c.id, c.title, c.created_at as createdAt
    FROM assistant_conversations c
    INNER JOIN assistant_shares s ON c.id = s.conversation_id
    WHERE s.share_token = ?
  `).get(token) as { id: string; title: string; createdAt: number } | undefined;

  if (!conversation) return null;

  const messages = db.prepare(`
    SELECT id, role, content, created_at as createdAt
    FROM assistant_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `).all(conversation.id) as Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
  }>;

  return { conversation, messages };
}

export default async function SharedConversationPage({ params }: SharedConversationPageProps) {
  const { token } = await params;
  const data = await getSharedConversation(token);

  if (!data) {
    notFound();
  }

  const { conversation, messages } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 border-b border-border/60 pb-6">
          <h1 className="text-2xl font-bold tracking-tight">{conversation.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Shared conversation • {new Date(conversation.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Messages */}
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border/60 bg-card/80'
                }`}
              >
                {message.role === 'assistant' ? (
                  <AssistantMarkdown content={message.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">
          <p>This is a shared conversation from Builder Studio AI Assistant</p>
        </div>
      </div>
    </div>
  );
}
