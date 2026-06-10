export type SlideType = "cover" | "content" | "quote" | "two-col" | "stat" | "image-full";
export type ThemeName = "editorial" | "bold" | "modern" | "minimal";

export interface DeckImage {
  alt: string;
  src: string;
}

export interface ParsedSlide {
  id: string;
  type: SlideType;
  title: string;
  body: string[];
  images: DeckImage[];
}

export interface LayoutSelection {
  slideId: string;
  layout: SlideType;
}
