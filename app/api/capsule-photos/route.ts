import { NextRequest, NextResponse } from "next/server";
import { CAPSULE_BUCKET, getSupabase } from "@/lib/supabase";

const MAX_BYTES = 4.5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const ownerUid = String(form.get("ownerUid") ?? "").replace(
      /[^a-zA-Z0-9]/g,
      "",
    );

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "사진 파일이 필요해요." },
        { status: 400 },
      );
    }
    if (!ownerUid) {
      return NextResponse.json(
        { error: "로그인 정보를 확인하지 못했어요." },
        { status: 401 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "사진이 너무 커요. 다른 사진을 골라 주세요." },
        { status: 413 },
      );
    }

    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase() || "jpg"
      : "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)
      ? extension
      : "jpg";
    const path = `${ownerUid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

    const { error } = await getSupabase()
      .storage.from(CAPSULE_BUCKET)
      .upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    const { data } = getSupabase().storage.from(CAPSULE_BUCKET).getPublicUrl(path);
    return NextResponse.json({ path, url: data.publicUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "사진을 올리지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
