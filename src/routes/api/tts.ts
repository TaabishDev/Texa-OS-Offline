import { createFileRoute } from "@tanstack/react-router";

// "Alice" — young friendly female voice (~24-28)
const DEFAULT_VOICE = "Xb7hH8MSUJpSbSDYk0k2";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { text, voiceId } = (await request.json()) as {
            text: string;
            voiceId?: string;
          };
          if (!text || typeof text !== "string") {
            return new Response("Missing text", { status: 400 });
          }
          const apiKey = process.env.ELEVENLABS_API_KEY;
          if (!apiKey) return new Response("ElevenLabs not connected", { status: 500 });

          // Trim & guard length — TTS works best under ~600 chars per request
          const safeText = text.replace(/\[REMEMBER:[^\]]*\]/gi, "").trim().slice(0, 2500);

          const r = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || DEFAULT_VOICE}/stream?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: safeText,
                model_id: "eleven_turbo_v2_5",
                voice_settings: {
                  stability: 0.45,
                  similarity_boost: 0.8,
                  style: 0.35,
                  use_speaker_boost: true,
                },
              }),
            },
          );
          if (!r.ok || !r.body) {
            const err = await r.text();
            return new Response(`TTS failed: ${err}`, { status: r.status });
          }
          return new Response(r.body, {
            headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
          });
        } catch (err) {
          const m = err instanceof Error ? err.message : "Unknown error";
          return new Response(`TTS error: ${m}`, { status: 500 });
        }
      },
    },
  },
});
