import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ----- profile -----
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("id, display_name, preferred_language, preferred_model, voice_enabled")
      .eq("id", context.userId)
      .maybeSingle();
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        display_name: z.string().optional(),
        preferred_language: z.string().optional(),
        preferred_model: z.string().optional(),
        voice_enabled: z.boolean().optional(),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- conversations -----
export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("conversations")
      .select("id, title, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ title: z.string().optional() }).parse(v))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("conversations")
      .insert({ user_id: context.userId, title: data.title || "New conversation" })
      .select("id, title, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    await context.supabase.from("conversations").delete().eq("id", data.id);
    return { ok: true };
  });

export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ id: z.string().uuid(), title: z.string().min(1).max(80) }).parse(v),
  )
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("conversations")
      .update({ title: data.title })
      .eq("id", data.id);
    return { ok: true };
  });

// ----- messages -----
export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ conversationId: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { data: rows } = await context.supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    return rows ?? [];
  });

export const saveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        conversationId: z.string().uuid(),
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("messages").insert({
      conversation_id: data.conversationId,
      user_id: context.userId,
      role: data.role,
      content: data.content,
    });
    if (error) throw new Error(error.message);
    await context.supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.conversationId);
    return { ok: true };
  });

// ----- memories -----
export const listMemories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("memories")
      .select("id, content, kind, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const addMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({ content: z.string().min(1).max(500), kind: z.string().optional() })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    await context.supabase.from("memories").insert({
      user_id: context.userId,
      content: data.content,
      kind: data.kind || "fact",
    });
    return { ok: true };
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    await context.supabase.from("memories").delete().eq("id", data.id);
    return { ok: true };
  });

// ----- permissions -----
export const listPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("permissions")
      .select("key, granted")
      .eq("user_id", context.userId);
    return data ?? [];
  });

export const setPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ key: z.string().min(1), granted: z.boolean() }).parse(v),
  )
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("permissions")
      .upsert(
        { user_id: context.userId, key: data.key, granted: data.granted },
        { onConflict: "user_id,key" },
      );
    return { ok: true };
  });
