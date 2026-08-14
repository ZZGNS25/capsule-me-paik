import { CAPSULE_BUCKET, supabase } from "@/lib/supabase";

export type Capsule = {
  id: string;
  owner_uid: string;
  title: string | null;
  recipient: string | null;
  letter: string | null;
  open_at: string;
  created_at: string;
  photo_paths: string[] | null;
};

export function getPhotoUrl(path: string) {
  return supabase.storage.from(CAPSULE_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

export function getCapsulePhotoUrls(paths: string[] | null | undefined) {
  return (paths ?? []).map(getPhotoUrl);
}

export function isCapsuleOpen(openAt: string, now = Date.now()) {
  return new Date(openAt).getTime() <= now;
}

export function formatOpenDate(openAt: string) {
  return new Date(openAt).toLocaleString("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function getCountdownParts(openAt: string, now = Date.now()) {
  const diff = Math.max(0, new Date(openAt).getTime() - now);

  if (diff === 0) {
    return { opened: true as const, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { opened: false as const, days, hours, minutes, seconds };
}

export function formatCountdownLabel(openAt: string, now = Date.now()) {
  const parts = getCountdownParts(openAt, now);
  if (parts.opened) return "지금 열 수 있어요";

  if (parts.days > 0) {
    return `${parts.days}일 ${parts.hours}시간 남음`;
  }
  if (parts.hours > 0) {
    return `${parts.hours}시간 ${parts.minutes}분 남음`;
  }
  if (parts.minutes > 0) {
    return `${parts.minutes}분 ${parts.seconds}초 남음`;
  }
  return `${parts.seconds}초 남음`;
}
