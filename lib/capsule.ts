import { CAPSULE_BUCKET, getSupabase } from "@/lib/supabase";

export const CAPSULE_SELECT =
  "id, owner_uid, title, recipient, letter, open_at, created_at, photo_paths, weather, weather_temp, weather_humidity, daily_quote, keywords, capsule_shape, capsule_color, capsule_color_alt";

export type Capsule = {
  id: string;
  owner_uid: string;
  title: string | null;
  recipient: string | null;
  letter: string | null;
  open_at: string;
  created_at: string;
  photo_paths: string[] | null;
  weather: string | null;
  weather_temp: number | null;
  weather_humidity: number | null;
  daily_quote: string | null;
  keywords: string[] | null;
  capsule_shape: string | null;
  capsule_color: string | null;
  capsule_color_alt: string | null;
};

export function getPhotoUrl(path: string) {
  return getSupabase().storage.from(CAPSULE_BUCKET).getPublicUrl(path).data
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

export function toDatetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function addDaysFromNow(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  next.setMinutes(0, 0, 0);
  return toDatetimeLocalValue(next);
}

const CAPSULE_DRAFT_KEY = "capsule-me-draft";
const CAPSULE_LOGIN_INTENT_KEY = "capsule-login-intent";

export type CapsuleDraft = {
  recipient: string;
  openAt: string;
};

export type CapsuleLoginIntent = "create" | "browse";

export function saveCapsuleDraft(draft: CapsuleDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CAPSULE_DRAFT_KEY, JSON.stringify(draft));
}

export function consumeCapsuleDraft(): CapsuleDraft | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(CAPSULE_DRAFT_KEY);
  sessionStorage.removeItem(CAPSULE_DRAFT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CapsuleDraft>;
    return {
      recipient: typeof parsed.recipient === "string" ? parsed.recipient : "",
      openAt: typeof parsed.openAt === "string" ? parsed.openAt : "",
    };
  } catch {
    return null;
  }
}

export function setCapsuleLoginIntent(intent: CapsuleLoginIntent) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CAPSULE_LOGIN_INTENT_KEY, intent);
}

export function consumeCapsuleLoginIntent(): CapsuleLoginIntent | null {
  if (typeof window === "undefined") return null;

  const intent = sessionStorage.getItem(CAPSULE_LOGIN_INTENT_KEY);
  sessionStorage.removeItem(CAPSULE_LOGIN_INTENT_KEY);
  if (intent === "create" || intent === "browse") return intent;
  return null;
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
