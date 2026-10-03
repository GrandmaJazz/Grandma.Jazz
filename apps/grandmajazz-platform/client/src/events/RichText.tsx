import { useEffect, useRef, useState } from "react";
import { ApiError, eventsApiUrl } from "./api";
import { cn } from "@/lib/utils";

/**
 * Minimal rich-text editor for event descriptions: contentEditable plus a
 * small toolbar (bold/italic, headings, lists, links, inline images).
 * Deliberately dependency-free — the server-side sanitizer allowlist
 * (p/br/strong/em/u/s/h2/h3/ul/ol/li/a/blockquote/img[local uploads]) is the
 * gatekeeper, so anything the browser produces beyond that is stripped on save.
 */

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  /** upload endpoint for inline images; hidden when absent (e.g. new drafts) */
  imageUploadEventId?: string;
  ariaDescribedBy?: string;
}

const BTN = "px-2.5 py-1 rounded-[6px] text-xs font-sans tracking-wide text-white/80 hover:bg-white hover:text-black transition-colors cursor-pointer border border-white/25";

export function RichTextEditor({ id, value, onChange, imageUploadEventId, ariaDescribedBy }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // set content only when it changes from outside (initial load / event switch)
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value ? "loaded" : "empty", imageUploadEventId]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const emit = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const addLink = () => {
    const url = window.prompt("Link address (https://…)");
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (!["https:", "http:", "mailto:", "tel:"].includes(parsed.protocol)) return;
      exec("createLink", parsed.toString());
    } catch {
      /* invalid URL — ignore */
    }
  };

  const insertImage = async (file: File) => {
    if (!imageUploadEventId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch(eventsApiUrl(`/manage/events/${imageUploadEventId}/images`), {
        method: "POST", credentials: "same-origin", body,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, json?.error || "Upload failed");
      ref.current?.focus();
      document.execCommand("insertHTML", false,
        `<img src="${json.path}" alt="" /><p><br></p>`);
      emit();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap gap-1.5 mb-2">
        <button type="button" className={cn(BTN, "font-bold")} onClick={() => exec("bold")} aria-label="Bold">B</button>
        <button type="button" className={cn(BTN, "italic")} onClick={() => exec("italic")} aria-label="Italic">I</button>
        <button type="button" className={BTN} onClick={() => exec("formatBlock", "<h2>")} aria-label="Heading">H2</button>
        <button type="button" className={BTN} onClick={() => exec("formatBlock", "<h3>")} aria-label="Subheading">H3</button>
        <button type="button" className={BTN} onClick={() => exec("formatBlock", "<p>")} aria-label="Paragraph">¶</button>
        <button type="button" className={BTN} onClick={() => exec("insertUnorderedList")} aria-label="Bulleted list">• list</button>
        <button type="button" className={BTN} onClick={() => exec("insertOrderedList")} aria-label="Numbered list">1. list</button>
        <button type="button" className={BTN} onClick={addLink} aria-label="Insert link">link</button>
        {imageUploadEventId && (
          <button type="button" className={BTN} disabled={uploading}
            onClick={() => fileRef.current?.click()} aria-label="Insert image">
            {uploading ? "uploading…" : "image"}
          </button>
        )}
        <button type="button" className={BTN} onClick={() => exec("removeFormat")} aria-label="Clear formatting">clear</button>
      </div>
      <div
        ref={ref}
        id={id}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-describedby={ariaDescribedBy}
        onInput={emit}
        onBlur={emit}
        className={cn(
          "min-h-[180px] w-full bg-black text-white border-2 border-white/50 rounded-[10px] px-4 py-3 text-[15px] font-light tracking-wide leading-relaxed",
          "focus:border-white/90 focus:outline-none",
          "[&_h2]:font-galvji-light [&_h2]:tracking-extra-wide [&_h2]:text-xl [&_h2]:mt-4 [&_h2]:mb-2",
          "[&_h3]:text-lg [&_h3]:mt-3 [&_h3]:mb-1.5",
          "[&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3",
          "[&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-white/40 [&_blockquote]:pl-4",
          "[&_img]:max-w-full [&_img]:rounded-[10px] [&_img]:border-2 [&_img]:border-white/40 [&_img]:my-3",
        )}
      />
      {uploadError && <p role="alert" className="mt-1.5 text-xs text-red-300">{uploadError}</p>}
      {!imageUploadEventId && (
        <p className="mt-1.5 text-xs text-white/40 font-light">Save the event first to insert images into the text.</p>
      )}
    </div>
  );
}
