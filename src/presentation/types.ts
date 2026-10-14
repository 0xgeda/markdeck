export const SLIDE_TYPES = [
  "cover",
  "content",
  "quote",
  "two-col",
  "stat",
  "image-full",
  "table",
  "bullet",
  "statement",
  "closing",
  "manifesto-banner",
  "kpi-tower",
  "kpi-ledger",
  "cells-3",
  "cells-4",
  "cells-6",
  "loop",
  "system-rings",
  "vertical-timeline",
  "image-hero",
  "duo-compare",
] as const;
export type SlideType = (typeof SLIDE_TYPES)[number];
export type ThemeName = "editorial" | "bold" | "modern" | "minimal" | "swiss";

export interface DeckImage {
  alt: string;
  src: string;
}

export interface SlideTable {
  headers: string[];
  rows: string[][];
}

export interface SlideBullets {
  ordered: boolean;
  items: string[];
}

export interface SlidePart {
  index: number;
  total: number;
}

export interface ParsedSlide {
  id: string;
  type: SlideType;
  title: string;
  body: string[];
  images: DeckImage[];
  table?: SlideTable;
  bullets?: SlideBullets;
  part?: SlidePart;
}

export interface LayoutSelection {
  slideId: string;
  layout: SlideType;
}
