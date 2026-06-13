"use client";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { Images, LayoutList } from "lucide-react";

interface PreviewEditorProps {
  slug: string;
}

type Panel = "images" | "slides" | null;

export function PreviewEditor({ slug }: PreviewEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideList, setSlideList] = useState<{ id: string; title: string }[]>([]);
  const [iframeReady, setIframeReady] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageList, setImageList] = useState<{ src: string; index: number }[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem(`deck:${slug}`);
    if (stored) setHtml(stored);
  }, [slug]);

  useEffect(() => {
    setCurrentSlide(0);
    setIframeReady(false);
  }, [html]);

  const collectSlides = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const sections = Array.from(doc.querySelectorAll<HTMLElement>(".slide"));
    setSlideList(
      sections.map((s, i) => {
        const id = s.getAttribute("data-slide-id") ?? String(i);
        const titleEl = s.querySelector("h1, h2, cite, blockquote");
        const rawTitle = titleEl?.textContent?.trim().slice(0, 60) || `Slide ${i + 1}`;
        const badge = s.querySelector(".pagebadge")?.textContent?.trim();
        const partMatch = badge?.match(/Part\s+(\d+)\s*\/\s*(\d+)/i);
        const title = partMatch ? `${rawTitle} · ${partMatch[1]}/${partMatch[2]}` : rawTitle;
        return { id, title };
      }),
    );
  }, []);

  const collectImages = useCallback(() => {
    const imgs = iframeRef.current?.contentDocument?.querySelectorAll<HTMLImageElement>("img") ?? [];
    setImageList(Array.from(imgs).map((img, i) => ({ src: img.src, index: i })));
  }, []);

  function injectPptStyle() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || doc.getElementById("ppt-style")) return;
    const style = doc.createElement("style");
    style.id = "ppt-style";
    style.textContent = `
      body.ppt-mode { overflow: hidden; height: 100vh; }
      body.ppt-mode main.deck { width: 100vw; max-width: none; padding: 0; margin: 0; }
      body.ppt-mode .slide:not(.ppt-active) { display: none !important; }
      body.ppt-mode .slide.ppt-active { margin: 0 !important; min-height: 100vh; border-radius: 0; border: none; box-shadow: none; }
    `;
    doc.head.appendChild(style);
  }

  function handleIframeLoad() {
    injectPptStyle();
    collectSlides();
    const doc = iframeRef.current?.contentDocument;
    doc?.addEventListener("keydown", forwardKey);
    setIframeReady(true);
  }

  const forwardKey = (e: KeyboardEvent) => {
    if (
      e.key === "ArrowDown" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === " "
    ) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: e.key, code: e.code }));
    }
  };

  function setEditable(next: boolean) {
    setEditMode(next);
    iframeRef.current?.contentDocument
      ?.querySelectorAll<HTMLElement>("[data-editable='text']")
      .forEach((node) => {
        node.contentEditable = String(next);
      });
  }

  useEffect(() => {
    if (!iframeReady) return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    if (editMode) {
      doc.body.classList.remove("ppt-mode");
      doc.querySelectorAll<HTMLElement>(".slide.ppt-active").forEach((el) =>
        el.classList.remove("ppt-active"),
      );
    } else {
      doc.body.classList.add("ppt-mode");
      const sections = doc.querySelectorAll<HTMLElement>(".slide");
      sections.forEach((el, i) => {
        el.classList.toggle("ppt-active", i === currentSlide);
      });
    }
  }, [editMode, currentSlide, iframeReady, slideList.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editMode) return;
      if (slideList.length === 0) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setCurrentSlide((i) => Math.min(i + 1, slideList.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentSlide((i) => Math.max(i - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, slideList.length]);

  function openPanel(next: Exclude<Panel, null>) {
    if (panel === next) {
      setPanel(null);
      return;
    }
    if (next === "images") collectImages();
    setPanel(next);
  }

  async function replaceImage(index: number, file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgs = iframeRef.current?.contentDocument?.querySelectorAll<HTMLImageElement>("img") ?? [];
      const target = Array.from(imgs)[index];
      if (target && e.target?.result) target.src = e.target.result as string;
      collectImages();
    };
    reader.readAsDataURL(file);
  }

  async function addImageSlides(files: FileList) {
    const doc = iframeRef.current?.contentDocument;
    const deck = doc?.querySelector("main.deck");
    if (!doc || !deck) return;
    const readers = Array.from(files).map(
      (file) =>
        new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = (e) => resolve((e.target?.result as string) ?? "");
          r.readAsDataURL(file);
        }),
    );
    const dataUrls = await Promise.all(readers);
    dataUrls.forEach((src, i) => {
      if (!src) return;
      const id = `slide-added-${Date.now()}-${i}`;
      const section = doc.createElement("section");
      section.className = "slide layout-image-full";
      section.setAttribute("data-slide-id", id);
      section.setAttribute("data-layout", "image-full");
      const img = doc.createElement("img");
      img.setAttribute("data-editable", "image");
      img.src = src;
      img.alt = "";
      img.className = "full-img";
      const caption = doc.createElement("div");
      caption.className = "image-caption";
      const h2 = doc.createElement("h2");
      h2.setAttribute("data-editable", "text");
      h2.setAttribute("data-field", "title");
      h2.textContent = "New slide";
      caption.appendChild(h2);
      section.appendChild(img);
      section.appendChild(caption);
      deck.appendChild(section);
    });
    collectSlides();
    collectImages();
    const total = doc.querySelectorAll(".slide").length;
    setCurrentSlide(Math.max(total - 1, 0));
  }

  async function save() {
    setSaveState("saving");
    setSaveError(null);
    try {
      const current = iframeRef.current?.contentDocument?.documentElement?.outerHTML ?? "";
      sessionStorage.setItem(`deck:${slug}`, current);
      setHtml(current);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveError("Save failed — please try again.");
      setSaveState("idle");
    }
  }

  function exportHtml() {
    const html = iframeRef.current?.contentDocument?.documentElement?.outerHTML ?? "";
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <header className="h-12 flex items-center gap-3 px-4 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
        <span className="font-display italic text-sm font-semibold text-gold">Markdeck</span>
        <Link href="/dashboard" aria-label="My Decks" className="text-xs text-zinc-500 hover:text-zinc-300 transition">
          ← My Decks
        </Link>
        {!editMode && slideList.length > 0 && (
          <span className="text-xs text-zinc-500 tabular-nums">
            {currentSlide + 1} / {slideList.length}
          </span>
        )}
        <div className="flex-1" />
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs text-zinc-400">Edit</span>
          <button
            role="checkbox"
            aria-label="Edit mode"
            aria-checked={editMode}
            onClick={() => setEditable(!editMode)}
            className={`relative w-8 rounded-full transition-colors ${editMode ? "bg-gold" : "bg-zinc-700"}`}
            style={{ height: "18px" }}
          >
            <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${editMode ? "left-4" : "left-0.5"}`} />
          </button>
        </label>
        <div className="w-px h-4 bg-zinc-800" />
        <button
          onClick={save}
          disabled={saveState === "saving"}
          aria-label={saveState === "saved" ? "Saved" : "Save"}
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition disabled:opacity-50"
        >
          {saveState === "saved" ? "Saved ✓" : "Save"}
        </button>
        <button
          onClick={exportHtml}
          aria-label="Export"
          className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition"
        >
          Export
        </button>
        <button
          onClick={() => openPanel("slides")}
          aria-label="Slides"
          aria-pressed={panel === "slides"}
          className={`text-xs px-3 py-1.5 rounded-md border transition flex items-center gap-1.5 ${
            panel === "slides" ? "border-gold text-gold" : "border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500"
          }`}
        >
          <LayoutList className="h-3.5 w-3.5" />
          Slides
        </button>
        <button
          onClick={() => openPanel("images")}
          aria-label="Images"
          aria-pressed={panel === "images"}
          className={`text-xs px-3 py-1.5 rounded-md border transition flex items-center gap-1.5 ${
            panel === "images" ? "border-gold text-gold" : "border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500"
          }`}
        >
          <Images className="h-3.5 w-3.5" />
          Images
        </button>
      </header>

      {saveError && (
        <p role="alert" className="text-xs text-red-400 bg-red-950/30 border-b border-red-900/50 px-4 py-2">
          {saveError}
        </p>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {html ? (
          <iframe
            ref={iframeRef}
            title="Deck preview"
            srcDoc={html}
            sandbox="allow-same-origin allow-popups"
            onLoad={handleIframeLoad}
            className="flex-1 border-0"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
            Loading deck…
          </div>
        )}

        {/* Slides panel */}
        {panel === "slides" && (
          <aside
            aria-label="slides panel"
            className="w-64 flex-shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col"
          >
            <div className="px-4 py-3 border-b border-zinc-800 text-xs font-semibold text-zinc-300">
              Slides
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {slideList.length === 0 && (
                <p className="text-xs text-zinc-600 text-center mt-4">No slides.</p>
              )}
              {slideList.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSlide(i)}
                  aria-current={i === currentSlide}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs flex gap-2 transition mb-0.5 ${
                    i === currentSlide
                      ? "bg-gold/10 text-gold"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  <span className="tabular-nums opacity-60 w-5 flex-shrink-0">{i + 1}</span>
                  <span className="truncate">{s.title}</span>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Images panel */}
        {panel === "images" && (
          <aside
            aria-label="images panel"
            className="w-64 flex-shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col"
          >
            <div className="px-4 py-3 border-b border-zinc-800 text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>Images</span>
              <label
                aria-label="Add images"
                className="text-[11px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-400 hover:text-gold hover:border-gold cursor-pointer transition"
              >
                + Add
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      addImageSlides(e.target.files);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {imageList.length === 0 && (
                <p className="text-xs text-zinc-600 text-center mt-4">No images yet — click + Add to insert image slides.</p>
              )}
              {imageList.map((img) => (
                <div key={img.index} className="border border-zinc-800 rounded-lg overflow-hidden">
                  <img
                    src={img.src}
                    alt={`Image ${img.index + 1}`}
                    className="w-full h-20 object-cover"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  <label className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-zinc-400 hover:text-gold cursor-pointer transition border-t border-zinc-800 bg-zinc-950">
                    Replace
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) replaceImage(img.index, file);
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
