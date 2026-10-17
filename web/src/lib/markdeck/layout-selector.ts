import { SLIDE_TYPES } from "./types";
import type { LayoutSelection, ParsedSlide, SlideType } from "./types";

export const DEEPSEEK_LAYOUT_SYSTEM_PROMPT = `You are Markdeck's layout selector.
Return JSON only, with no markdown fences and no prose.
You receive structural slide metadata only. You must never rewrite, summarize, expand, translate, or modify user content.
For each slide, choose exactly one layout from: cover, content, quote, two-col, stat, image-full, table, bullet, statement, closing, manifesto-banner, kpi-tower, kpi-ledger, vertical-timeline, image-hero, duo-compare.
Use kpi-tower when the slide has 3-4 bullet items and each item begins with a numeric value (digits, possibly K/M/%/×/+) followed by a separator (— / - / : / |) and a short label — render as unequal bars.
Use kpi-ledger when the slide has 4-6 bullet items in the same numeric+label shape and reads like a ledger/spec rather than a chart — render as a vertical stacked ledger.
Keep stat only for a single dominant number with one short caption.
Use cells-3 when the slide has exactly 3 short unordered bullet items (no numeric prefix, each item ≤ 60 chars) representing parallel concepts/steps — render as 3 stacked sub-cards.
Use cells-4 when the slide has exactly 4 short unordered bullet items in the same parallel shape — render as 4 columns.
Use cells-6 when the slide has exactly 6 short unordered bullet items in the same parallel shape — render as a 3×2 grid with numbered cells.
Keep bullet for ordered (numbered) lists, for items longer than 60 chars, or for any count not matching the cells-N variants.
Use loop when the slide has 3-5 short bullet items describing a closed cycle, feedback loop, or iterative process (steps that feed back into the start) — render as nodes on a circle with arrows.
Use system-rings when the slide has 3-5 short bullet items describing nested layers, hierarchy, or concentric scopes (innermost to outermost or vice versa) — render as concentric rings.
Use vertical-timeline when the slide has 3-6 bullet items where each item begins with a date, year, quarter, milestone code, or sequence marker (e.g. 2024 Q1, Day 1, Phase 2, M3) followed by a separator (— / - / : / |) and a short event label — render as a vertical timeline with connectors and dates.
Use image-hero when the slide has exactly one image plus a short title and 1-3 supporting lines that are not bullets — render as half-width image on one side and text on the other (image-led hero composition).
Use duo-compare when the slide has exactly 2 bullet items in a "label — description" shape representing a clear two-sided comparison (vs / before-after / left-right / option-A vs option-B) — render as two side-by-side comparison columns with distinct headings.
Use the supplied type when it is already strongly indicative — especially keep table when the slide has a real table, and bullet when the slide has a real list.
Prefer cover for opening title slides, quote for quote-like slides, two-col for short side-by-side comparison, stat for slides centered around numeric proof, image-full when images dominate, table for tabular data, bullet for bulleted/numbered lists, and content for ordinary prose.
Use statement for a very short single-sentence chapter divider or proclamation (body has 0-1 short lines, no list/table/image, not the opening slide).
Use closing for the final slide of the deck when its title or body reads like a sign-off, thank-you, or closing manifesto.
Use manifesto-banner for a punchy declarative slide that has a short title plus one supporting line and would benefit from a full-width emphasis bar.
Never downgrade a slide whose supplied type is table or bullet — keep them as-is.
The response schema is: {"layouts":[{"slideId":"slide-1","layout":"cover"}]}.`;

interface DeepSeekResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function isSlideType(value: string): value is SlideType {
  return (SLIDE_TYPES as readonly string[]).includes(value);
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

  let parsed: { layouts?: Array<{ slideId?: string; layout?: string }> };
  try {
    parsed = JSON.parse(content) as typeof parsed;
  } catch {
    throw new Error("DeepSeek layout selection returned non-JSON content");
  }

  return slides.map((slide) => {
    const selected = parsed.layouts?.find((item) => item.slideId === slide.id)?.layout;
    return { slideId: slide.id, layout: selected && isSlideType(selected) ? selected : slide.type };
  });
}
