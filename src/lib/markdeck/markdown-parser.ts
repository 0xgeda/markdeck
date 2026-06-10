import type { DeckImage, ParsedSlide, SlideType } from "./types";

const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
const imageLine = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/;
const statPattern = /^\*\*\d+([.,]\d+)?%?\*\*/;

function parseImages(text: string): DeckImage[] {
  return [...text.matchAll(imagePattern)].map((match) => ({ alt: match[1], src: match[2] }));
}

function hasContent(lines: string[]): boolean {
  return lines.some((l) => l.trim().length > 0);
}

function classify(title: string, lines: string[], firstHeadingLevel: number): SlideType {
  const joined = lines.join("\n").trim();
  const images = parseImages(joined);
  const withoutImages = joined.replace(imagePattern, "").trim();
  if (firstHeadingLevel === 1) return "cover";
  if (joined.startsWith(">")) return "quote";
  if (images.length > 0 && withoutImages.length === 0) return "image-full";
  if (lines.some((line) => line.includes("|"))) return "two-col";
  if (lines.some((line) => statPattern.test(line.trim()))) return "stat";
  return "content";
}

export function parseMarkdownToSlides(markdown: string): ParsedSlide[] {
  const blocks: Array<{ level: number; title: string; lines: string[] }> = [];
  let current: { level: number; title: string; lines: string[] } | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const h1 = rawLine.match(/^#\s+(.+)$/);
    const h2 = rawLine.match(/^##\s+(.+)$/);

    if (h1 || h2) {
      if (current) blocks.push(current);
      current = { level: h1 ? 1 : 2, title: (h1?.[1] ?? h2?.[1] ?? "").trim(), lines: [] };
      continue;
    }

    // Blockquote line starts its own slide when the current block already has content.
    if (rawLine.startsWith(">") && current && hasContent(current.lines)) {
      blocks.push(current);
      current = { level: 2, title: "", lines: [] };
    }

    // Standalone image line starts its own slide when the current block has non-image content.
    if (imageLine.test(rawLine) && current && hasContent(current.lines.filter((l) => !imageLine.test(l)))) {
      blocks.push(current);
      current = { level: 2, title: "", lines: [] };
    }

    if (!current && rawLine.trim().length > 0) {
      current = { level: 2, title: "", lines: [] };
    }
    current?.lines.push(rawLine);
  }
  if (current && (current.title || hasContent(current.lines))) blocks.push(current);

  return blocks.map((block, index) => ({
    id: `slide-${index + 1}`,
    type: classify(block.title, block.lines, block.level),
    title: block.title,
    body: block.lines.filter((line) => line.trim().length > 0 && !imageLine.test(line)),
    images: parseImages(block.lines.join("\n")),
  }));
}
