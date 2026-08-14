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

export function useNotificationPermission() {
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  async function enable() {
    const result = await requestNotificationPermission();
    if (result !== "unsupported") {
      setPermission(result);
    }
    return result;
  }

  return { permission, enable };
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
      <div className="steel-panel-glow w-full max-w-md px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="status-lamp status-lamp-open" />
          <p className="label-caps text-emerald-300">Unsealed</p>
        </div>
        <p className="etched mt-2 text-base font-semibold">캡슐이 열렸어요</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          {message.name}에게 남긴 이야기를 지금 열어볼 수 있어요.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Link
            href={`/capsule/${message.id}`}
            className="btn-primary px-4 py-2 text-sm"
            onClick={onClose}
          >
            열어보기
          </Link>
          <button type="button" onClick={onClose} className="btn-ghost">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

type NotificationPromptProps = {
  permission: NotificationPermission | "unsupported";
  onEnable: () => void;
};

export function NotificationPrompt({
  permission,
  onEnable,
}: NotificationPromptProps) {
  if (permission !== "default") return null;

  return (
    <div className="steel-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="etched text-sm font-medium">열람 시점 알림 받기</p>
        <p className="mt-0.5 text-xs text-slate-400">
          캡슐이 열리면 브라우저 알림으로 알려드려요.
        </p>
      </div>
      <button type="button" onClick={onEnable} className="btn-secondary text-sm">
        알림 켜기
      </button>
    </div>
  );
}
