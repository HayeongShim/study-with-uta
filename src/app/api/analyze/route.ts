import { NextRequest, NextResponse } from "next/server";
import { AnalyzeResponse } from "@/lib/types";

type AnalyzeRequest = {
  title?: string;
  artist?: string;
  lyrics?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AnalyzeRequest;
  const lines = splitLyrics(body.lyrics ?? "");

  if (lines.length === 0) {
    return NextResponse.json({ lines: [] } satisfies AnalyzeResponse);
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(createFallbackAnalysis(lines));
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You analyze Japanese song lyrics for a Korean learner. Return only valid JSON matching the requested schema. Keep translations natural and concise.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: body.title ?? "",
            artist: body.artist ?? "",
            lines,
            task:
              "For each input line, provide Japanese reading in kana, Korean translation, and 1-4 useful vocabulary items.",
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "lyric_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              lines: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    reading: { type: "string" },
                    translation: { type: "string" },
                    vocabulary: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          surface: { type: "string" },
                          reading: { type: "string" },
                          meaningKo: { type: "string" },
                          partOfSpeech: { type: "string" },
                        },
                        required: ["surface", "reading", "meaningKo", "partOfSpeech"],
                      },
                    },
                  },
                  required: ["text", "reading", "translation", "vocabulary"],
                },
              },
            },
            required: ["lines"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: detail }, { status: 502 });
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  const text =
    payload.output_text ??
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === "output_text")?.text;

  if (!text) {
    return NextResponse.json({ error: "OpenAI response did not include text output." }, { status: 502 });
  }

  return NextResponse.json(JSON.parse(text) as AnalyzeResponse);
}

function splitLyrics(rawLyrics: string) {
  return rawLyrics
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function createFallbackAnalysis(lines: string[]): AnalyzeResponse {
  return {
    lines: lines.map((line) => ({
      text: line,
      reading: "OPENAI_API_KEY 설정 후 실제 독음이 생성돼요",
      translation: "OPENAI_API_KEY 설정 후 한국어 번역이 생성돼요.",
      vocabulary: extractFallbackWords(line),
    })),
  };
}

function extractFallbackWords(line: string) {
  const words = [...new Set(line.match(/[一-龯ぁ-んァ-ンー]{2,}/g) ?? [])].slice(0, 4);
  return words.map((word) => ({
    surface: word,
    reading: "분석 대기",
    meaningKo: "분석 대기",
    partOfSpeech: "unknown",
  }));
}
