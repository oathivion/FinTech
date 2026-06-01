import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";

type AiCharacterField = {
  label: string;
  value: string | number | boolean;
  confidence: number;
  reason: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("OPENAI_API_KEY exists:", Boolean(process.env.OPENAI_API_KEY));

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Missing OPENAI_API_KEY environment variable.",
    });
  }

  const openai = new OpenAI({
    apiKey,
  });

  const { text } = req.body ?? {};

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing extracted sheet text." });
  }

  const trimmedText = text.slice(0, 12000);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You extract tabletop RPG character sheet data from messy OCR or PDF text. Return only valid JSON. Do not include markdown.",
        },
        {
          role: "user",
          content: `
Extract likely character sheet fields from this text.

Return JSON in this exact shape:

{
  "fields": [
    {
      "label": "Character Name",
      "value": "Example Name",
      "confidence": 0.92,
      "reason": "Short reason for why this value was selected"
    }
  ],
  "warnings": [
    "Any uncertainty or missing data"
  ]
}

Supported labels:
- Ruleset
- Character Name
- Class
- Background
- Species
- Level
- Armor Class
- Speed
- Maximum HP
- Current HP
- Proficiency Bonus
- Spellcasting Ability
- Strength
- Dexterity
- Constitution
- Intelligence
- Wisdom
- Charisma

Rules:
- Use confidence between 0 and 1.
- Only include fields you can reasonably infer.
- Do not invent values.
- Prefer exact values found in the text.
- If uncertain, lower the confidence and add a warning.

Character sheet text:
${trimmedText}
          `,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "AI returned no content." });
    }

    const parsed = JSON.parse(content) as {
      fields?: AiCharacterField[];
      warnings?: string[];
    };

    return res.status(200).json({
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      receivedCharacters: text.length,
      usedCharacters: trimmedText.length,
    });
  } catch (error) {
    return res.status(500).json({
      error: "AI-assisted parsing failed.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}