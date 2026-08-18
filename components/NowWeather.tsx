"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WeatherSnapshot } from "@/lib/weather";
import { weatherVisual } from "@/lib/weather";
import WeatherCapsule from "@/components/WeatherCapsule";

const REFRESH_MS = 10 * 60 * 1000;

type NowWeatherProps = {
  caption?: string;
  className?: string;
  onSnapshot?: (snapshot: WeatherSnapshot | null) => void;
};

function getBrowserCoords(): Promise<{ lat?: number; lng?: number }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({});
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve({}),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

export async function fetchLiveWeather(): Promise<WeatherSnapshot | null> {
  const coords = await getBrowserCoords();
  const params = new URLSearchParams();
  if (coords.lat != null && coords.lng != null) {
    params.set("lat", String(coords.lat));
    params.set("lng", String(coords.lng));
  }

  const response = await fetch(`/api/weather?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as WeatherSnapshot;
}

export default function NowWeather({
  caption,
  className = "",
  onSnapshot,
}: NowWeatherProps) {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;

  const load = useCallback(async () => {
    setStatus((prev) => (prev === "ready" ? prev : "loading"));
    try {
      const next = await fetchLiveWeather();
      setSnapshot(next);
      setUpdatedAt(next ? Date.now() : null);
      setStatus(next ? "ready" : "error");
      onSnapshotRef.current?.(next);
    } catch {
      setSnapshot(null);
      setStatus("error");
      onSnapshotRef.current?.(null);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const visual = weatherVisual(
    snapshot?.weather,
    snapshot?.weather_temp,
    snapshot?.weather_humidity,
  );
  const humidity = snapshot?.weather_humidity;
  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <section className={`steel-card px-5 py-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-caps">Now</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {caption ?? "지금 이 순간의 날씨와 위치"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="btn-ghost shrink-0 text-xs"
        >
          새로고침
        </button>
      </div>

      {status === "loading" && !snapshot ? (
        <div className="mt-4 flex items-center gap-4">
          <div className="countdown-cell h-20 w-16 animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-6 w-24 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-40 animate-pulse rounded bg-white/5" />
            <p className="mono-readout text-xs text-slate-500">
              위치와 날씨를 불러오는 중…
            </p>
          </div>
        </div>
      ) : null}

      {status === "error" && !snapshot ? (
        <p className="mt-4 text-sm text-slate-400">
          날씨를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      ) : null}

      {snapshot ? (
        <div className="mt-3 flex items-center gap-4">
          <WeatherCapsule
            shape={visual.shape}
            color={visual.capsule_color}
            colorAlt={visual.capsule_color_alt}
            sealed={false}
            size="sm"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              {snapshot.weather_temp != null ? (
                <p className="mono-readout countdown-digit text-3xl font-semibold leading-none">
                  {Number(snapshot.weather_temp)}
                  <span className="ml-0.5 text-lg">℃</span>
                </p>
              ) : (
                <p className="mono-readout text-lg text-slate-400">--℃</p>
              )}
              <p className="etched text-base font-semibold">{snapshot.weather}</p>
            </div>

            {humidity != null ? (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>습도</span>
                  <span className="mono-readout text-sky-200">{humidity}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/45">
                  <div
                    className="h-full rounded-full bg-sky-300/85"
                    style={{ width: `${Math.max(4, Math.min(100, humidity))}%` }}
                  />
                </div>
              </div>
            ) : null}

            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-300">
              <PinIcon />
              <span className="truncate">{snapshot.location ?? "위치 확인 중"}</span>
            </p>
            <p className="mono-readout mt-1 text-[11px] text-slate-500">
              {snapshot.fallback ? "위치 권한 없음 · 서울 기준" : "현재 위치 기준"}
              {updatedLabel ? ` · ${updatedLabel}` : ""}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 text-sky-300"
      aria-hidden="true"
    >
      <path
        d="M12 21s7-7.2 7-12a7 7 0 10-14 0c0 4.8 7 12 7 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="9" r="2.2" fill="currentColor" />
    </svg>
  );
}
