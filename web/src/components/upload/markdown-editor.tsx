"use client";

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  onFileLoad: (v: string) => void;
}

export function MarkdownEditor({ value, onChange, onFileLoad }: MarkdownEditorProps) {
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onFileLoad(ev.target?.result as string);
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col h-full flex-1">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <label htmlFor="markdown-input" className="text-xs font-mono text-gray-500 uppercase tracking-widest cursor-default">Markdown</label>
        <label className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer">
          Upload .md
          <input
            type="file"
            accept=".md,text/markdown,text/plain"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>
      <textarea
        id="markdown-input"
        className="flex-1 bg-transparent text-gray-100 font-mono text-sm resize-none outline-none p-6 placeholder:text-gray-600 leading-relaxed"
        placeholder={"# My Proposal\n\nStart writing your Markdown here..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
