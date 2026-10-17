import type { DeckImage, ParsedSlide, SlideBullets, SlideTable, SlideType } from "./types";

const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
const imageLine = /^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/;
const tableDivider = /^\s*\|?[\s:\-|]+\|[\s:\-|]+\|?\s*$/;
const tableRow = /^\s*\|.*\|\s*$/;
const bulletLine = /^\s*[-*+]\s+(.+)$/;
const orderedLine = /^\s*\d+\.\s+(.+)$/;
const statPattern = /^\*\*[^*]*\d[^*]*\*\*/;
const headingLine = /^#{1,6}\s+/;
const MAX_BODY_LINES_PER_SLIDE = 12;

interface RawBlock {
  level: number;
  title: string;
  lines: string[];
}

type SubSlide = Omit<ParsedSlide, "id">;

function parseImages(text: string): DeckImage[] {
  return [...text.matchAll(imagePattern)].map((m) => ({ alt: m[1], src: m[2] }));
}

function splitCells(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

function extractTable(lines: string[]): { table?: SlideTable; rest: string[] } {
  for (let i = 0; i < lines.length - 1; i++) {
    if (tableRow.test(lines[i]) && tableDivider.test(lines[i + 1])) {
      const headers = splitCells(lines[i]);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && tableRow.test(lines[j]) && !tableDivider.test(lines[j])) {
        rows.push(splitCells(lines[j]));
        j++;
      }
      const rest = [...lines.slice(0, i), ...lines.slice(j)];
      return { table: { headers, rows }, rest };
    }
  }
  return { rest: lines };
}

function extractAllTables(lines: string[]): { tables: SlideTable[]; rest: string[] } {
  const tables: SlideTable[] = [];
  let remaining = lines;
  while (true) {
    const { table, rest } = extractTable(remaining);
    if (!table) break;
    tables.push(table);
    remaining = rest;
  }
  return { tables, rest: remaining };
}

function extractBullets(lines: string[]): { bullets?: SlideBullets; rest: string[] } {
  const items: string[] = [];
  const rest: string[] = [];
  let ordered: boolean | null = null;
  for (const line of lines) {
    const u = line.match(bulletLine);
    const o = line.match(orderedLine);
    if (u) {
      if (ordered === null) ordered = false;
      items.push(u[1].trim());
    } else if (o) {
      if (ordered === null) ordered = true;
      items.push(o[1].trim());
    } else {
      rest.push(line);
    }
  }
  if (items.length >= 3) return { bullets: { ordered: ordered ?? false, items }, rest };
  return { rest: lines };
}

function cleanBody(lines: string[]): string[] {
  return lines
    .map((l) => l.replace(headingLine, ""))
    .map((l) => l.replace(/^\s*[-*+]\s+/, ""))
    .map((l) => l.replace(/^\s*\d+\.\s+/, ""))
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !tableDivider.test(l))
    .filter((l) => l !== "---");
}

function classifyTextSlide(body: string[], images: DeckImage[]): SlideType {
  const joined = body.join("\n").trim();
  if (joined.length === 0 && images.length > 0) return "image-full";
  if (body.length > 0 && body.every((l) => l.trim().startsWith(">"))) return "quote";
  if (body.some((l) => statPattern.test(l.trim()))) return "stat";
  return "content";
}

function parseRawBlocks(markdown: string): RawBlock[] {
  const blocks: RawBlock[] = [];
  let current: RawBlock | null = null;
  for (const raw of markdown.split(/\r?\n/)) {
    const h1 = raw.match(/^#\s+(.+)$/);
    const h2 = raw.match(/^##\s+(.+)$/);
    if (h1 || h2) {
      if (current) blocks.push(current);
      current = { level: h1 ? 1 : 2, title: (h1?.[1] ?? h2?.[1] ?? "").trim(), lines: [] };
      continue;
    }
    if (!current && raw.trim().length > 0) {
      current = { level: 2, title: "", lines: [] };
    }
    current?.lines.push(raw);
  }
  if (current) blocks.push(current);
  return blocks;
}

function buildSubSlides(block: RawBlock): SubSlide[] {
  const cleanedLines = block.lines.filter((l) => !imageLine.test(l));
  const images = parseImages(block.lines.join("\n"));
  const { tables, rest: afterTables } = extractAllTables(cleanedLines);
  const { bullets, rest: afterBullets } = extractBullets(afterTables);
  const body = cleanBody(afterBullets);

  // H1 → 总是 cover；其内额外的表格/列表/正文极少见，做兜底处理
  if (block.level === 1) {
    const subs: SubSlide[] = [
      { type: "cover", title: block.title, body, images },
    ];
    tables.forEach((t) =>
      subs.push({ type: "table", title: block.title, body: [], images: [], table: t }),
    );
    if (bullets) {
      subs.push({ type: "bullet", title: block.title, body: [], images: [], bullets });
    }
    return subs;
  }

  // H2 — 多重内容拆成多张 sub-slide
  const subs: SubSlide[] = [];
  const hasTextSlide = body.length > 0 || (images.length > 0 && tables.length === 0 && !bullets);

  if (hasTextSlide || (!tables.length && !bullets && (block.title || images.length > 0))) {
    subs.push({
      type: classifyTextSlide(body, images),
      title: block.title,
      body,
      images,
    });
  }

  if (bullets) {
    subs.push({ type: "bullet", title: block.title, body: [], images: [], bullets });
  }

  tables.forEach((t) =>
    subs.push({ type: "table", title: block.title, body: [], images: [], table: t }),
  );

  return subs;
}

function paginate(slide: ParsedSlide): ParsedSlide[] {
  const MAX = MAX_BODY_LINES_PER_SLIDE;

  if (slide.type === "content" && slide.body.length > MAX) {
    const total = Math.ceil(slide.body.length / MAX);
    return Array.from({ length: total }, (_, i) => ({
      ...slide,
      id: i === 0 ? slide.id : `${slide.id}-p${i + 1}`,
      body: slide.body.slice(i * MAX, (i + 1) * MAX),
      part: { index: i + 1, total },
    }));
  }

  if (slide.type === "bullet" && slide.bullets && slide.bullets.items.length > MAX) {
    const items = slide.bullets.items;
    const ordered = slide.bullets.ordered;
    const total = Math.ceil(items.length / MAX);
    return Array.from({ length: total }, (_, i) => ({
      ...slide,
      id: i === 0 ? slide.id : `${slide.id}-p${i + 1}`,
      bullets: { ordered, items: items.slice(i * MAX, (i + 1) * MAX) },
      part: { index: i + 1, total },
    }));
  }

  if (slide.type === "table" && slide.table && slide.table.rows.length > MAX) {
    const headers = slide.table.headers;
    const rows = slide.table.rows;
    const total = Math.ceil(rows.length / MAX);
    return Array.from({ length: total }, (_, i) => ({
      ...slide,
      id: i === 0 ? slide.id : `${slide.id}-p${i + 1}`,
      table: { headers, rows: rows.slice(i * MAX, (i + 1) * MAX) },
      part: { index: i + 1, total },
    }));
  }

  return [slide];
}

function isEmpty(sub: SubSlide): boolean {
  return (
    sub.title.trim().length === 0 &&
    sub.body.length === 0 &&
    sub.images.length === 0 &&
    !sub.table &&
    !sub.bullets
  );
}

export function parseMarkdownToSlides(markdown: string): ParsedSlide[] {
  const blocks = parseRawBlocks(markdown);
  const out: ParsedSlide[] = [];
  let counter = 0;

  for (const block of blocks) {
    const subs = buildSubSlides(block).filter((s) => !isEmpty(s));
    subs.forEach((sub, i) => {
      counter++;
      const id = i === 0 ? `slide-${counter}` : `slide-${counter}`;
      const slide: ParsedSlide = { ...sub, id };
      paginate(slide).forEach((p) => out.push(p));
    });
  }
  return out;
}
