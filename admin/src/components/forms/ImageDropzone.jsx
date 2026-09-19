import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable image dropzone — single or multi.
 * Returns base64 data URLs so the UI shows previews immediately while the
 * underlying File objects are kept for the multipart upload.
 */
export default function ImageDropzone({
  multiple = false,
  value = multiple ? [] : "",
  onChange,
  files,
  onFilesChange,
  className,
  testid,
  hint,
}) {
  const [busy, setBusy] = useState(false);

  const handleDrop = useCallback(
    async (accepted) => {
      if (!accepted?.length) return;
      setBusy(true);
      const reads = await Promise.all(
        accepted.map(
          (f) =>
            new Promise((res) => {
              const r = new FileReader();
              r.onload = () => res({ url: r.result, file: f });
              r.readAsDataURL(f);
            }),
        ),
      );
      if (multiple) {
        onChange?.([...(value || []), ...reads.map((r) => r.url)]);
        onFilesChange?.([...(files || []), ...reads.map((r) => r.file)]);
      } else {
        onChange?.(reads[0].url);
        onFilesChange?.(reads[0].file);
      }
      setBusy(false);
    },
    [multiple, value, onChange, files, onFilesChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: { "image/*": [] },
    multiple,
  });

  const removeAt = (i) => {
    if (!multiple) {
      onChange?.("");
      onFilesChange?.(null);
      return;
    }
    onChange?.(value.filter((_, idx) => idx !== i));
    onFilesChange?.((files || []).filter((_, idx) => idx !== i));
  };

  const hasMulti = multiple && Array.isArray(value) && value.length > 0;
  const hasSingle = !multiple && !!value;

  return (
    <div className={cn("space-y-3", className)}>
      {!hasSingle && (
        <div
          {...getRootProps()}
          data-testid={testid}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors cursor-pointer",
            "border-border hover:border-foreground/50 hover:bg-accent/40",
            isDragActive && "border-brand bg-brand/5",
            multiple ? "min-h-[120px]" : "aspect-[4/3]",
          )}
        >
          <input {...getInputProps()} />
          {busy ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="grid place-items-center w-10 h-10 rounded-lg bg-secondary">
                {multiple ? <Upload className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
              </div>
              <div className="text-sm font-semibold">
                {isDragActive ? "Drop to upload" : multiple ? "Drag & drop or browse" : "Upload thumbnail"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {hint || "PNG, JPG, WEBP up to ~8MB each"}
              </div>
            </>
          )}
        </div>
      )}

      {hasSingle && (
        <div className="relative group">
          <img
            src={value}
            alt="upload"
            className="w-full aspect-[4/3] object-cover rounded-xl border border-border"
          />
          <button
            type="button"
            onClick={() => removeAt(0)}
            className="absolute top-2 right-2 grid place-items-center w-8 h-8 rounded-lg bg-background/95 backdrop-blur border border-border hover:bg-background transition-colors"
            data-testid={`${testid}-remove`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {hasMulti && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((src, i) => (
            <div key={i} className="relative group">
              <img src={src} alt={`img-${i}`} className="w-full aspect-square object-cover rounded-lg border border-border" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 grid place-items-center w-6 h-6 rounded-md bg-background/95 border border-border opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            {...getRootProps()}
            type="button"
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-foreground/50 hover:bg-accent/40 transition-colors grid place-items-center"
          >
            <input {...getInputProps()} />
            <Upload className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
