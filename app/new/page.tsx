"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import {
  addDaysFromNow,
  consumeCapsuleDraft,
  toDatetimeLocalValue,
} from "@/lib/capsule";
import { formatWeatherLine, type WeatherSnapshot } from "@/lib/weather";
import type { CapsuleStyle } from "@/lib/gemini";
import { getFirebaseAuth } from "@/lib/firebase";
import { CAPSULE_BUCKET, getSupabase } from "@/lib/supabase";
import AppHeader from "@/components/AppHeader";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import NowWeather, { fetchLiveWeather } from "@/components/NowWeather";
import PageShell from "@/components/PageShell";
import WeatherCapsule from "@/components/WeatherCapsule";
import KeywordChips from "@/components/KeywordChips";

type CapsuleResult = {
  id: string;
  recipient: string;
  openAt: string;
  photoUrls: string[];
  weather: string | null;
  weather_temp: number | null;
  weather_humidity: number | null;
  location: string | null;
  daily_quote: string | null;
  keywords: string[] | null;
  capsule_shape: string | null;
  capsule_color: string | null;
  capsule_color_alt: string | null;
};

const DATE_PRESETS = [
  { label: "1주 후", days: 7 },
  { label: "1개월 후", days: 30 },
  { label: "1년 후", days: 365 },
] as const;

export default function NewCapsulePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [letter, setLetter] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CapsuleResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [liveWeather, setLiveWeather] = useState<WeatherSnapshot | null>(null);

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  const previewUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function handleFilesChange(selected: FileList | null) {
    if (!selected) return;
    setFiles((prev) => [...prev, ...Array.from(selected)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return error.message;
    }
    return "캡슐을 묻지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  function resetForm() {
    setRecipient("");
    setLetter("");
    setOpenAt("");
    setFiles([]);
    setResult(null);
    setErrorMessage(null);
    setCopied(false);
  }

  async function handleGoogleLogin() {
    setLoginBusy(true);
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    } finally {
      setLoginBusy(false);
    }
  }

  async function copyShareLink(id: string) {
    const url = `${window.location.origin}/capsule/${id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function fetchTodayWeather() {
    return liveWeather ?? (await fetchLiveWeather());
  }

  async function fetchCapsuleStyle(payload: {
    weather: string | null;
    weather_temp: number | null;
    weather_humidity: number | null;
    recipient: string;
    letter: string;
  }): Promise<CapsuleStyle | null> {
    const response = await fetch("/api/capsule-style", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    return (await response.json()) as CapsuleStyle;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const currentUser = getFirebaseAuth().currentUser ?? user;
    if (!currentUser) {
      setErrorMessage("로그인 후 캡슐을 묻을 수 있어요.");
      return;
    }

    if (files.length === 0) {
      setErrorMessage("사진을 한 장 이상 골라 주세요.");
      return;
    }

    if (new Date(openAt).getTime() <= Date.now()) {
      setErrorMessage("열람일은 현재 시각 이후로 설정해 주세요.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const timestamp = Date.now();
      const photoPaths: string[] = [];
      const photoUrls: string[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const extension = file.name.includes(".")
          ? file.name.split(".").pop()?.toLowerCase() || "jpg"
          : "jpg";
        const path = `${currentUser.uid}/${timestamp}-${index}.${extension}`;

        const { error } = await getSupabase().storage
          .from(CAPSULE_BUCKET)
          .upload(path, file, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });

        if (error) {
          throw error;
        }

        const { data } = getSupabase().storage
          .from(CAPSULE_BUCKET)
          .getPublicUrl(path);

        photoPaths.push(path);
        photoUrls.push(data.publicUrl);
      }

      let weather = null;
      let weatherTemp = null;
      let weatherHumidity = null;
      let location = null;
      try {
        const snapshot = await fetchTodayWeather();
        if (snapshot) {
          weather = snapshot.weather;
          weatherTemp = snapshot.weather_temp;
          weatherHumidity = snapshot.weather_humidity;
          location = snapshot.location;
        }
      } catch (weatherError) {
        console.error(weatherError);
      }

      let style: CapsuleStyle | null = null;
      try {
        style = await fetchCapsuleStyle({
          weather,
          weather_temp: weatherTemp,
          weather_humidity: weatherHumidity,
          recipient,
          letter,
        });
      } catch (styleError) {
        console.error(styleError);
      }

      const { data, error } = await getSupabase()
        .from("capsules")
        .insert({
          owner_uid: currentUser.uid,
          recipient,
          title: recipient,
          letter,
          open_at: new Date(openAt).toISOString(),
          photo_paths: photoPaths,
          weather,
          weather_temp: weatherTemp,
          weather_humidity: weatherHumidity,
          daily_quote: style?.daily_quote ?? null,
          keywords: style?.keywords ?? [],
          capsule_shape: style?.capsule_shape ?? null,
          capsule_color: style?.capsule_color ?? null,
          capsule_color_alt: style?.capsule_color_alt ?? null,
        })
        .select(
          "id, recipient, open_at, weather, weather_temp, weather_humidity, daily_quote, keywords, capsule_shape, capsule_color, capsule_color_alt",
        )
        .single();

      if (error) {
        throw error;
      }

      setResult({
        id: data.id,
        recipient: data.recipient ?? recipient,
        openAt: data.open_at,
        photoUrls,
        weather: data.weather ?? weather,
        weather_temp: data.weather_temp ?? weatherTemp,
        weather_humidity: data.weather_humidity ?? weatherHumidity,
        location,
        daily_quote: data.daily_quote ?? style?.daily_quote ?? null,
        keywords: data.keywords ?? style?.keywords ?? null,
        capsule_shape: data.capsule_shape ?? style?.capsule_shape ?? null,
        capsule_color: data.capsule_color ?? style?.capsule_color ?? null,
        capsule_color_alt:
          data.capsule_color_alt ?? style?.capsule_color_alt ?? null,
      });
      setFiles([]);
    } catch (error) {
      console.error(error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (!authReady) {
    return (
      <PageShell centered>
        <p className="mono-readout text-sm text-slate-500">INITIALIZING…</p>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto w-full max-w-3xl">
          <AppHeader />
          <main className="steel-panel mx-auto mt-16 max-w-lg px-8 py-12 text-center">
            <p className="label-caps">Access Required</p>
            <h1 className="etched mt-3 text-2xl font-semibold">
              로그인이 필요해요
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              캡슐을 묻으려면 Google 계정으로 로그인해 주세요.
            </p>
            <div className="mt-8">
              <GoogleLoginButton onClick={handleGoogleLogin} busy={loginBusy} />
            </div>
          </main>
        </div>
      </PageShell>
    );
  }

  if (result) {
    const openDateLabel = new Date(result.openAt).toLocaleString("ko-KR", {
      dateStyle: "long",
      timeStyle: "short",
    });

    return (
      <PageShell>
        <div className="mx-auto w-full max-w-3xl">
          <AppHeader />
          <main className="steel-panel-glow mx-auto mt-10 w-full max-w-lg px-8 py-10 text-center">
            <div className="countdown-cell mx-auto flex h-12 w-12 items-center justify-center rounded-full">
              <span className="status-lamp status-lamp-open" />
            </div>
            <p className="label-caps mt-6 text-emerald-300">Sealed</p>
            <h1 className="etched mt-3 text-3xl font-semibold tracking-tight">
              캡슐을 묻었어요
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {result.recipient}님에게 전할 이야기가 안전하게 보관되었습니다.
              <br />
              열람일은 {openDateLabel}입니다.
            </p>
            {result.capsule_shape ? (
              <div className="mt-6 flex justify-center">
                <WeatherCapsule
                  shape={result.capsule_shape}
                  color={result.capsule_color}
                  colorAlt={result.capsule_color_alt}
                  sealed
                  size="md"
                />
              </div>
            ) : null}
            {result.daily_quote ? (
              <p className="mt-4 text-sm leading-relaxed text-sky-100">
                {result.daily_quote}
              </p>
            ) : null}
            <KeywordChips keywords={result.keywords} className="mt-3 justify-center" />
            {formatWeatherLine(result) ? (
              <p className="mono-readout mt-3 text-sm text-sky-200">
                묻은 날 · {formatWeatherLine(result)}
                {result.location ? ` · ${result.location}` : ""}
              </p>
            ) : null}

            <div className="steel-card mt-8 px-5 py-5 text-left">
              <p className="label-caps">Capsule ID</p>
              <p className="mono-readout glow-text mt-1 break-all text-sm">
                {result.id}
              </p>

              <p className="label-caps mt-5">Share Link</p>
              <div className="mt-2 flex gap-2">
                <p className="mono-readout field min-w-0 flex-1 truncate px-3 py-2 text-xs text-slate-400">
                  /capsule/{result.id}
                </p>
                <button
                  type="button"
                  onClick={() => void copyShareLink(result.id)}
                  className="btn-secondary shrink-0 px-3 py-2 text-xs"
                >
                  {copied ? "복사됨" : "복사"}
                </button>
              </div>

              <p className="label-caps mt-5">Photos</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {result.photoUrls.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <img
                      src={url}
                      alt={`업로드된 사진 ${index + 1}`}
                      className="photo-frame h-20 w-20 object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/" className="btn-primary">
                보드에서 보기
              </Link>
              <Link
                href={`/capsule/${result.id}`}
                className="btn-secondary"
              >
                캡슐 상세
              </Link>
              <button type="button" onClick={resetForm} className="btn-secondary">
                하나 더 묻기
              </button>
            </div>
          </main>
        </div>
      </PageShell>
    );
  }

  const minOpenAt = toDatetimeLocalValue(new Date());

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-3xl">
        <AppHeader />
        <main className="steel-panel mx-auto mt-10 w-full max-w-lg px-8 py-10">
          <p className="label-caps text-center">Seal Protocol</p>
          <h1 className="etched mt-2 text-center text-3xl font-semibold tracking-tight">
            캡슐 묻기
          </h1>
          <p className="mt-3 text-center text-sm text-slate-400">
            편지와 사진을 봉인하고, 정해진 날에 함께 열어보세요.
            <br />
            묻는 순간의 날씨로 캡슐의 색과 형태가 정해지고,
            키워드만 미리 남습니다.
          </p>
          <NowWeather
            className="mt-6"
            caption="지금 이 순간의 날씨와 위치입니다. 묻는 날씨는 캡슐에 함께 기록됩니다"
            onSnapshot={setLiveWeather}
          />
          <hr className="steel-rule mt-6" />

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-left text-sm font-medium text-slate-300">
              받는 사람
              <input
                type="text"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                className="field"
                placeholder="누구에게 남길까요?"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-left text-sm font-medium text-slate-300">
              편지
              <textarea
                value={letter}
                onChange={(event) => setLetter(event.target.value)}
                rows={6}
                className="field resize-y"
                placeholder="전하고 싶은 이야기를 적어 주세요."
                required
              />
            </label>

            <div className="flex flex-col gap-2 text-left text-sm font-medium text-slate-300">
              <label htmlFor="open-at">열람일</label>
              <input
                id="open-at"
                type="datetime-local"
                value={openAt}
                min={minOpenAt}
                onChange={(event) => setOpenAt(event.target.value)}
                className="field"
                required
              />
              <div className="mt-1 flex flex-wrap gap-2">
                {DATE_PRESETS.map(({ label, days }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setOpenAt(addDaysFromNow(days))}
                    className="chip"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 text-left text-sm font-medium text-slate-300">
              <label htmlFor="photos">
                사진{" "}
                {files.length > 0 ? (
                  <span className="mono-readout glow-text text-xs">
                    ({files.length}장 선택됨)
                  </span>
                ) : null}
              </label>
              <input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  handleFilesChange(event.target.files);
                  event.target.value = "";
                }}
                className="field cursor-pointer file:mr-3 file:rounded-md file:border file:border-black/70 file:bg-slate-600 file:px-3 file:py-1.5 file:text-sm file:text-slate-100"
              />
            </div>

            {previewUrls.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {previewUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative">
                    <img
                      src={url}
                      alt={`선택한 사진 ${index + 1}`}
                      className="photo-frame h-20 w-20 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-slate-900 bg-slate-800 text-xs text-slate-100 shadow-[0_1px_3px_rgba(9,13,20,0.4)] hover:bg-red-700"
                      aria-label={`사진 ${index + 1} 제거`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="alert-error">{errorMessage}</div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-2 w-full"
            >
              {submitting ? "봉인 중…" : "캡슐 묻기"}
            </button>
          </form>
        </main>
      </div>
    </PageShell>
  );
}
