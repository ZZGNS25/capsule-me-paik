import { CAPSULE_BUCKET, getSupabase } from "@/lib/supabase";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;
const MAX_BYTES = 4 * 1024 * 1024;

export async function prepareCapsulePhoto(file: File): Promise<File> {
  if (file.size === 0) {
    throw new Error(
      "빈 파일이에요. OneDrive에만 있는 파일이면 먼저 이 PC에 받은 다음 다시 골라 주세요.",
    );
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    if (file.size > MAX_BYTES) {
      throw new Error("사진이 너무 커요. JPG 또는 PNG로 다시 골라 주세요.");
    }
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });
  if (!blob) return file;

  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}

export async function uploadCapsulePhoto(file: File, ownerUid: string) {
  const prepared = await prepareCapsulePhoto(file);
  const body = new FormData();
  body.append("file", prepared);
  body.append("ownerUid", ownerUid);

  const response = await fetch("/api/capsule-photos", {
    method: "POST",
    body,
  });
  const payload = (await response.json().catch(() => null)) as
    | { path?: string; url?: string; error?: string }
    | null;

  if (response.ok && payload?.path && payload.url) {
    return { path: payload.path, url: payload.url };
  }

  const extension = prepared.type === "image/png" ? "png" : "jpg";
  const path = `${ownerUid.replace(/[^a-zA-Z0-9]/g, "")}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { error } = await getSupabase()
    .storage.from(CAPSULE_BUCKET)
    .upload(path, prepared, {
      contentType: prepared.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw new Error(payload?.error || error.message || "사진을 올리지 못했습니다.");
  }

  const { data } = getSupabase().storage.from(CAPSULE_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}
