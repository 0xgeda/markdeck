"use client";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { Images } from "lucide-react";

interface PreviewEditorProps {
  slug: string;
}

export function PreviewEditor({ slug }: PreviewEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState("");
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(`deck:${slug}`);
    if (stored) setHtml(stored);
  }, [slug]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [imageList, setImageList] = useState<{ src: string; index: number }[]>([]);

  function setEditable(next: boolean) {
    setEditMode(next);
    iframeRef.current?.contentDocument
      ?.querySelectorAll<HTMLElement>("[data-editable='text']")
      .forEach((node) => { node.contentEditable = String(next); });
  }

  function collectImages() {
    const imgs = iframeRef.current?.contentDocument?.querySelectorAll<HTMLImageElement>("img") ?? [];
    setImageList(Array.from(imgs).map((img, i) => ({ src: img.src, index: i })));
  }

  function toggleImages() {
    if (!showImages) collectImages();
    setShowImages((v) => !v);
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
          onClick={toggleImages}
          aria-label="Images"
          className={`text-xs px-3 py-1.5 rounded-md border transition flex items-center gap-1.5 ${
            showImages ? "border-gold text-gold" : "border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500"
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
            className="flex-1 border-0"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
            Loading deck…
          </div>
        )}

        {/* Images panel */}
        {showImages && (
          <aside
            aria-label="images panel"
            className="w-64 flex-shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col"
          >
            <div className="px-4 py-3 border-b border-zinc-800 text-xs font-semibold text-zinc-300">
              Images
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {imageList.length === 0 && (
                <p className="text-xs text-zinc-600 text-center mt-4">No images in this deck.</p>
              )}
              {imageList.map((img) => (
                <div key={img.index} className="border border-zinc-800 rounded-lg overflow-hidden">
                  <img src={img.src} alt={`Image ${img.index + 1}`} className="w-full h-20 object-cover" />
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
