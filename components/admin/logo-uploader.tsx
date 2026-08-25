"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

export function LogoUploader({
  currentUrl,
  onUpload,
  type = "company",
  label = "Upload Logo",
}: {
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  type?: "company" | "carrier" | "website";
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || "");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);

    try {
      const res = await fetch("/api/upload/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setPreview(data.url);
        onUpload(data.url);
      } else {
        alert(data.error || "Upload failed");
        setPreview(currentUrl || "");
      }
    } catch {
      alert("Upload failed");
      setPreview(currentUrl || "");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {preview && (
          <img src={preview} alt="Logo preview" className="h-16 w-16 object-contain border rounded bg-white p-1" />
        )}
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
          {uploading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : null}
          {uploading ? "Uploading..." : label}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
      <p className="text-xs text-gray-500">PNG, JPG, SVG, WEBP - Max 5MB - Will appear in all documents and reports</p>
    </div>
  );
}
