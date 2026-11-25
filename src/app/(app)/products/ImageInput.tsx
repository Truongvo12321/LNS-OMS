"use client";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

/** Chọn ảnh từ máy (JPEG/PNG/WebP ≤ 2MB), xem trước ngay; server kiểm tra lại nội dung file khi lưu. */
export default function ImageInput({ current }: { current?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(current);
  const [remove, setRemove] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f?: File) => {
    setError("");
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { setError("Chỉ nhận ảnh JPEG, PNG hoặc WebP"); input.current!.value = ""; return; }
    if (f.size > 2 * 1024 * 1024) { setError("Ảnh tối đa 2MB"); input.current!.value = ""; return; }
    setRemove(false);
    setPreview(URL.createObjectURL(f));
  };
  const clear = () => { if (input.current) input.current.value = ""; setPreview(undefined); setRemove(!!current); setError(""); };

  return (
    <div>
      <span className="label">Ảnh sản phẩm</span>
      <div className="flex items-center gap-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-bg">
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước (blob:) / ảnh từ DB */}
          {preview ? <img src={preview} alt="Ảnh sản phẩm xem trước" className="size-full object-contain" /> : <ImagePlus aria-hidden size={22} className="text-slate-300" />}
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <label className="btn-ghost cursor-pointer">
              <ImagePlus aria-hidden size={16} />{preview ? "Đổi ảnh" : "Tải ảnh lên"}
              <input ref={input} type="file" name="image" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            {preview && <button type="button" className="btn-ghost text-red-700" onClick={clear}><Trash2 aria-hidden size={16} />Bỏ ảnh</button>}
          </div>
          <p className="text-xs text-slate-500">JPEG, PNG hoặc WebP · tối đa 2MB</p>
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        </div>
      </div>
      {remove && <input type="hidden" name="removeImage" value="1" />}
    </div>
  );
}
