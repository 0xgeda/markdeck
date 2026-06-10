import type { LayoutSelection, ParsedSlide, SlideType } from "./types";

const layouts: SlideType[] = ["cover", "content", "quote", "two-col", "stat", "image-full"];

export const DEEPSEEK_LAYOUT_SYSTEM_PROMPT = `You are Markdeck's layout selector.
Return JSON only, with no markdown fences and no prose.
You receive structural slide metadata only. You must never rewrite, summarize, expand, translate, or modify user content.
For each slide, choose exactly one layout from: cover, content, quote, two-col, stat, image-full.
Use the supplied type when it is already strongly indicative.
Prefer cover for opening title slides, quote for quote-like slides, two-col for comparison or table-like slides, stat for slides centered around numeric proof, image-full when images dominate, and content for ordinary text slides.
The response schema is: {"layouts":[{"slideId":"slide-1","layout":"cover"}]}.`;

interface DeepSeekResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function isSlideType(value: string): value is SlideType {
  return layouts.includes(value as SlideType);
}

export async function selectLayouts(slides: ParsedSlide[], apiKey: string): Promise<LayoutSelection[]> {
  const structuralInput = {
    slides: slides.map((slide) => ({
      id: slide.id,
      type: slide.type,
      bodyLineCount: slide.body.length,
      imageCount: slide.images.length,
    })),
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DEEPSEEK_LAYOUT_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(structuralInput) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek layout selection failed with status ${response.status}`);
  }

  const json = (await response.json()) as DeepSeekResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek layout selection returned an empty response");

  const parsed = JSON.parse(content) as { layouts?: Array<{ slideId?: string; layout?: string }> };
  return slides.map((slide) => {
    const selected = parsed.layouts?.find((item) => item.slideId === slide.id)?.layout;
    return { slideId: slide.id, layout: selected && isSlideType(selected) ? selected : slide.type };
  });
}
