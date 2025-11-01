import { supabase } from '../lib/supabaseClient';

export type StudioRole = 'user' | 'assistant';

export interface StudioMessage {
  id: string;
  role: StudioRole;
  content: string;
  provider?: string;
  model?: string;
  total_tokens?: number;
  latency_ms?: number;
  cached?: boolean;
  created_at: string;
}

export interface StudioConversation {
  id: string;
  title: string;
  system_prompt: string;
  model: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export class StudioStorage {
  async getConversations(): Promise<StudioConversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }

    return data || [];
  }

  async getConversation(id: string): Promise<StudioConversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Failed to load conversation:', error);
      return null;
    }

    return data;
  }

  async createConversation(
    title: string,
    userId: string,
    options?: {
      model?: string;
      system_prompt?: string;
    }
  ): Promise<StudioConversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title,
        model: options?.model || 'gemini-2.0-flash-exp',
        system_prompt: options?.system_prompt || '',
        message_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }

    return data;
  }

  async updateConversation(
    id: string,
    updates: Partial<Pick<StudioConversation, 'title' | 'system_prompt' | 'model'>>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('conversations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Failed to update conversation:', error);
      return false;
    }

    return true;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const { error } = await supabase.from('conversations').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete conversation:', error);
      return false;
    }

    return true;
  }

  async getMessages(conversationId: string): Promise<StudioMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load messages:', error);
      return [];
    }

    return data || [];
  }

  async addMessage(
    conversationId: string,
    role: StudioRole,
    content: string,
    metadata?: {
      provider?: string;
      model?: string;
      total_tokens?: number;
      latency_ms?: number;
      cached?: boolean;
    }
  ): Promise<StudioMessage | null> {
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        provider: metadata?.provider,
        model: metadata?.model,
        total_tokens: metadata?.total_tokens,
        latency_ms: metadata?.latency_ms,
        cached: metadata?.cached || false
      })
      .select()
      .single();

    if (messageError) {
      console.error('Failed to add message:', messageError);
      return null;
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('message_count')
      .eq('id', conversationId)
      .single();

    const newCount = (conv?.message_count || 0) + 1;

    await supabase
      .from('conversations')
      .update({
        message_count: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    return message;
  }
}
