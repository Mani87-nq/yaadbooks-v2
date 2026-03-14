/**
 * POST /api/v1/ai/chat — AI Business Assistant powered by Claude
 *
 * Agentic AI that fetches real business data via tool_use and provides
 * contextual financial advice. Supports user API keys, multi-turn
 * tool execution, and image analysis (Vision).
 *
 * Image support is gated behind user's own API key.
 *
 * TIER PROTECTED: Requires 'ai_assistant' feature (Professional+)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { internalError, badRequest } from '@/lib/api-error';
import { resolveAIProvider, createAnthropicClient } from '@/lib/ai/providers';
import { AI_TOOLS } from '@/lib/ai/tools';
import { executeTool } from '@/lib/ai/tool-handlers';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { withFeatureCheck } from '@/lib/tier';

const MAX_TOOL_ITERATIONS = 10; // Safety limit to prevent infinite loops

async function _POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'reports:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const body = await request.json();
    const { message, conversationHistory = [], images } = body as {
      message: string;
      conversationHistory?: Array<{ role: string; content: string }>;
      images?: Array<{ data: string; mediaType: string }>;
    };

    if (!message) return badRequest('Message is required');

    // ── Resolve AI provider (user key > system key) ──
    const providerConfig = await resolveAIProvider(companyId!);
    if (!providerConfig) {
      return NextResponse.json({
        response: 'AI features require an API key. Add your Anthropic API key in **Settings > Integrations**, or ask your administrator to configure the system API key.',
      });
    }

    // Currently only Anthropic is supported for tool_use
    if (providerConfig.provider !== 'anthropic') {
      return NextResponse.json({
        response: `Tool-use features are currently only available with Anthropic (Claude). Your configured provider is "${providerConfig.provider}". Please add an Anthropic API key in Settings > Integrations for full agentic capabilities.`,
      });
    }

    // ── Gate image support behind user's own API key ──
    if (images && images.length > 0 && providerConfig.source !== 'user') {
      return NextResponse.json({
        response: 'Image analysis requires your own API key. Add your Anthropic API key in **Settings > Integrations** to unlock image analysis, receipt scanning, and other advanced AI features.',
        requiresApiKey: true,
      });
    }

    const client = createAnthropicClient(providerConfig.apiKey);

    // ── Build enhanced system prompt ──
    const systemPrompt = await buildSystemPrompt(companyId!);

    // ── Build messages from conversation history ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: Array<{ role: 'user' | 'assistant'; content: any }> = [
      ...conversationHistory.slice(-10).map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // Build the current user message — with optional images
    if (images && images.length > 0) {
      // Multi-modal message with images + text
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentBlocks: any[] = [];

      // Add images first
      for (const img of images.slice(0, 3)) { // Max 3 images per message
        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType,
            data: img.data,
          },
        });
      }

      // Add text message
      contentBlocks.push({ type: 'text', text: message });

      messages.push({ role: 'user', content: contentBlocks });
    } else {
      messages.push({ role: 'user', content: message });
    }

    const toolResults: Array<{ tool: string; input: unknown; summary?: string }> = [];
    let iterations = 0;

    // ── Agentic tool-use loop ──
    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        tools: AI_TOOLS,
        messages,
      });

      // If Claude wants to use tools, execute them and loop
      if (response.stop_reason === 'tool_use') {
        // Append assistant message with tool_use blocks
        messages.push({ role: 'assistant', content: response.content });

        // Execute all requested tools in parallel
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

        const results = await Promise.all(
          toolUseBlocks.map(async (block) => {
            // Extract tool_use fields safely
            const toolBlock = block as unknown as { id: string; name: string; input: Record<string, unknown> };
            const result = await executeTool(toolBlock.name, companyId!, toolBlock.input);
            toolResults.push({
              tool: toolBlock.name,
              input: toolBlock.input,
            });
            return {
              type: 'tool_result' as const,
              tool_use_id: toolBlock.id,
              content: result,
            };
          })
        );

        // Send tool results back to Claude
        messages.push({ role: 'user', content: results });
        continue;
      }

      // ── Final response (end_turn or max_tokens) ──
      const responseText = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as unknown as { text: string }).text)
        .join('');

      return NextResponse.json({
        response: responseText || 'I could not generate a response.',
        toolsUsed: toolResults.map(t => ({ tool: t.tool, input: t.input })),
        apiKeySource: providerConfig.source, // 'user' or 'system'
      });
    }

    // Hit max iterations — return what we have
    return NextResponse.json({
      response: 'I reached the maximum number of data lookups for this question. Please try a more specific question, or break it into smaller parts.',
      toolsUsed: toolResults.map(t => ({ tool: t.tool, input: t.input })),
      apiKeySource: providerConfig.source,
    });
  } catch (error) {
    console.error('[AI Chat] Error:', error);

    // Provide more helpful error messages
    const err = error as { status?: number; message?: string };
    if (err.status === 401) {
      return NextResponse.json({
        response: 'Your AI API key appears to be invalid or expired. Please update it in **Settings > Integrations**.',
      });
    }
    if (err.status === 429) {
      return NextResponse.json({
        response: 'AI rate limit reached. Please wait a moment and try again.',
      });
    }

    return internalError(error instanceof Error ? error.message : 'AI chat failed');
  }
}

// Tier-protected export: Requires 'ai_assistant' feature (Professional+)
export const POST = withFeatureCheck('ai_assistant', _POST);
