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
            [
              "You analyze Japanese song lyrics for a Korean learner.",
              "Return only valid JSON matching the requested schema.",
              "Before translating line by line, infer the overall mood, speaker attitude, and emotional register of the full lyrics.",
              "Keep every Korean translation accurate to the source text while making the wording feel like one coherent song translation.",
              "Use a consistent Korean tone across all lines, avoiding a mix of stiff literal phrasing and casual conversational phrasing unless the original lyrics clearly shift tone.",
              "Keep translations natural, concise, and lyrical without adding meaning that is not present in the source.",
              "For reading fields, convert Japanese kanji to kana, but preserve Latin alphabet words exactly as written.",
              "For pronunciationKo, transliterate only Japanese text into Hangul and preserve Latin alphabet words exactly as written.",
              "Do not convert English or other Latin alphabet lyrics into katakana.",
            ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            title: body.title ?? "",
            artist: body.artist ?? "",
            lines,
            task:
              [
                "For each input line, provide Japanese reading in kana, Korean pronunciation transliterated in Hangul, Korean translation, and 1-4 useful vocabulary items.",
                "For translation, use the full set of lines as context so the Korean wording has one stable lyric tone from beginning to end.",
                "Prefer clear Korean lyric phrasing over awkward dictionary-style fragments, but do not loosen the meaning.",
                "Examples: どれも -> reading どれも, pronunciationKo 도레모.",
                "I love 君 -> reading I love きみ, pronunciationKo I love 키미.",
                "Never rewrite English as katakana, even when it appears inside Japanese lyrics.",
              ].join(" "),
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
                    pronunciationKo: { type: "string" },
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
                  required: ["text", "reading", "pronunciationKo", "translation", "vocabulary"],
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
      pronunciationKo: "OPENAI_API_KEY 설정 후 한글 발음이 생성돼요",
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
