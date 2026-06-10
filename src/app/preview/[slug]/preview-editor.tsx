"use client";
import { useRef, useState } from "react";

export function PreviewEditor({ deckId, initialHtml }: { deckId: string; initialHtml: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editMode, setEditMode] = useState(false);

  function setEditable(next: boolean) {
    setEditMode(next);
    iframeRef.current?.contentDocument
      ?.querySelectorAll<HTMLElement>("[data-editable='text']")
      .forEach((node) => { node.contentEditable = String(next); });
  }

  async function save() {
    const html = iframeRef.current?.contentDocument?.documentElement?.outerHTML ?? "";
    await fetch(`/api/decks/${deckId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html }),
    });
  }

  function exportHtml() {
    const html = iframeRef.current?.contentDocument?.documentElement?.outerHTML ?? "";
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "markdeck.html";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function onDrop(event: React.DragEvent<HTMLIFrameElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    const doc = iframeRef.current?.contentDocument;
    const image = doc?.querySelector<HTMLImageElement>("img:hover") ?? null;
    if (!file || !image) return;
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`/api/decks/${deckId}/assets`, { method: "POST", body: formData });
    const result = (await response.json()) as { storage_url: string };
    image.src = result.storage_url;
  }

  return (
    <section>
      <div className="preview-toolbar">
        <label>
          Edit mode
          <input role="switch" aria-label="Edit mode" type="checkbox" checked={editMode} onChange={(e) => setEditable(e.target.checked)} />
        </label>
        <button type="button" onClick={save}>Save</button>
        <button type="button" onClick={exportHtml}>Export HTML</button>
      </div>
      <iframe
        ref={iframeRef}
        title="Deck preview"
        srcDoc={initialHtml}
        sandbox="allow-same-origin allow-popups"
        style={{ border: 0, display: "block", width: "100%", height: "calc(100vh - 48px)" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      />
    </section>
  );
}
