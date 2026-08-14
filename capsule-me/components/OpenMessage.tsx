"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isCapsuleOpen, type Capsule } from "@/lib/capsule";

export type OpenMessage = {
  id: string;
  name: string;
};

type UseCapsuleOpenAlertOptions = {
  capsules: Capsule[];
  enabled?: boolean;
};

export function useCapsuleOpenAlert({
  capsules,
  enabled = true,
}: UseCapsuleOpenAlertOptions) {
  const [message, setMessage] = useState<OpenMessage | null>(null);
  const prevOpenMap = useRef<Map<string, boolean>>(new Map());
  const primed = useRef(false);
  const capsulesRef = useRef(capsules);

  useEffect(() => {
    capsulesRef.current = capsules;
  }, [capsules]);

  useEffect(() => {
    if (!enabled) return;

    const check = () => {
      const list = capsulesRef.current;
      if (list.length === 0) return;

      const now = Date.now();
      const nextMap = new Map<string, boolean>();

      for (const capsule of list) {
        const opened = isCapsuleOpen(capsule.open_at, now);
        nextMap.set(capsule.id, opened);

        if (!primed.current) continue;

        const wasOpen = prevOpenMap.current.get(capsule.id);
        if (wasOpen === false && opened) {
          const name = capsule.recipient || capsule.title || "이름 없는 캡슐";
          setMessage({ id: capsule.id, name });

          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("캡슐이 열렸어요", {
              body: `${name}에게 남긴 이야기를 지금 열어볼 수 있어요.`,
              tag: `capsule-open-${capsule.id}`,
            });
          }
        }
      }

      prevOpenMap.current = nextMap;
      primed.current = true;
    };

    check();
    const timer = window.setInterval(check, 1000);
    return () => window.clearInterval(timer);
  }, [enabled, capsules]);

  function dismiss() {
    setMessage(null);
  }

  return { message, dismiss };
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported" as const;
  }
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;
  return (await Notification.requestPermission()) as
    | "granted"
    | "denied"
    | "default";
}

type OpenMessageBannerProps = {
  message: OpenMessage | null;
  onClose: () => void;
};

export function OpenMessageBanner({
  message,
  onClose,
}: OpenMessageBannerProps) {
  if (!message) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white/95 px-5 py-4 shadow-lg backdrop-blur-sm">
        <p className="text-xs tracking-[0.18em] text-emerald-600">OPENED</p>
        <p className="mt-2 text-base font-semibold text-slate-800">
          캡슐이 열렸어요
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          {message.name}에게 남긴 이야기를 지금 열어볼 수 있어요.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Link
            href={`/capsule/${message.id}`}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            onClick={onClose}
          >
            열어보기
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 transition hover:text-slate-600"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
