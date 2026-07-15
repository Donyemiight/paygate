/**
 * LLM-backed "Translate" agent.
 *
 * Charges $0.03 per call. Translates text into a target language using
 * OpenAI gpt-4o-mini if OPENAI_API_KEY is set, otherwise returns a
 * deterministic mock so the demo is reviewable without external dependencies.
 *
 * This is the killer demo agent — it shows PayGate protecting a real
 * AI service, not just a regex match.
 */

export interface TranslateInput {
  text: string;
  targetLang: string; // e.g. "French", "Spanish", "Japanese"
}

export interface TranslateOutput {
  translation: string;
  sourceLang: string;
  targetLang: string;
  model: string;
  charCount: number;
}

const MOCK_DICTIONARY: Record<string, Record<string, string>> = {
  French: { hello: "bonjour", world: "monde", love: "amour", agent: "agent" },
  Spanish: { hello: "hola", world: "mundo", love: "amor", agent: "agente" },
  Japanese: { hello: "こんにちは", world: "世界", love: "愛", agent: "エージェント" },
  German: { hello: "hallo", world: "welt", love: "liebe", agent: "agent" },
};

export async function translateHandler(input: TranslateInput): Promise<TranslateOutput> {
  const text = (input.text ?? "").trim();
  const targetLang = input.targetLang ?? "French";

  if (!text) {
    return { translation: "", sourceLang: "auto", targetLang, model: "mock", charCount: 0 };
  }

  if (process.env.OPENAI_API_KEY) {
    // Real LLM call
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a translator. Translate the user's text into ${targetLang}. Output only the translation, no preamble.`,
            },
            { role: "user", content: text },
          ],
          max_tokens: 200,
        }),
      });
      if (!res.ok) {
        throw new Error(`OpenAI returned ${res.status}`);
      }
      const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
      return {
        translation: json.choices[0]?.message?.content?.trim() ?? "",
        sourceLang: "auto",
        targetLang,
        model: "gpt-4o-mini",
        charCount: text.length,
      };
    } catch (e) {
      // fall through to mock
      console.warn("[translate] OpenAI call failed, using mock:", (e as Error).message);
    }
  }

  // Mock: word-by-word replacement if we have a dictionary entry
  const dict = MOCK_DICTIONARY[targetLang];
  if (dict) {
    const words = text.toLowerCase().split(/\s+/);
    const translated = words.map((w) => dict[w] ?? w).join(" ");
    return {
      translation: translated,
      sourceLang: "en",
      targetLang,
      model: "mock",
      charCount: text.length,
    };
  }

  // No dictionary, no API key: prefix the input
  return {
    translation: `[${targetLang}] ${text}`,
    sourceLang: "en",
    targetLang,
    model: "mock",
    charCount: text.length,
  };
}
