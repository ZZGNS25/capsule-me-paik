"use client";

import { FormEvent, useEffect, useState } from "react";
import { addDaysFromNow, saveCapsuleDraft, setCapsuleLoginIntent } from "@/lib/capsule";
import { getSupabase } from "@/lib/supabase";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import WeatherCapsule from "@/components/WeatherCapsule";

type LandingScreenProps = {
  onGoogleLogin: () => void;
  busy?: boolean;
  error?: string | null;
};

type Phase = "compose" | "seal" | "welcome-back";

const DATE_PRESETS = [
  { label: "1주 후", days: 7 },
  { label: "1개월 후", days: 30 },
  { label: "1년 후", days: 365 },
] as const;

export default function LandingScreen({
  onGoogleLogin,
  busy = false,
  error = null,
}: LandingScreenProps) {
  const [phase, setPhase] = useState<Phase>("compose");
  const [capsuleCount, setCapsuleCount] = useState<number | null>(null);
  const [recipient, setRecipient] = useState("");
  const [openInDays, setOpenInDays] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCount() {
      const { count, error: countError } = await getSupabase()
        .from("capsules")
        .select("*", { count: "exact", head: true });

      if (cancelled || countError || typeof count !== "number") return;
      setCapsuleCount(count);
    }

    void loadCount();
    return () => {
      cancelled = true;
    };
  }, []);

  function beginSeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveCapsuleDraft({
      recipient: recipient.trim(),
      openAt: openInDays != null ? addDaysFromNow(openInDays) : "",
    });
    setCapsuleLoginIntent("create");
    setPhase("seal");
  }

  function beginWelcomeBack() {
    setCapsuleLoginIntent("browse");
    setPhase("welcome-back");
  }

  return (
    <main className="steel-panel-glow mx-auto w-full max-w-lg px-8 py-12 text-center sm:px-10">
      <div className="capsule-float mx-auto flex justify-center">
        <WeatherCapsule
          shape="orb"
          color="#38bdf8"
          colorAlt="#7dd3fc"
          sealed
          size="lg"
        />
      </div>

      <p className="label-caps mt-6">Time Capsule Protocol</p>
      <h1 className="etched mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        캡슐 미
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-400">
        미래의 나에게, 혹은 누군가에게
        <br />
        이 순간의 편지와 사진을 묻어 두세요.
      </p>

      <div className="countdown-cell mx-auto mt-8 max-w-xs px-5 py-5">
        <p className="label-caps">Buried Capsules</p>
        <p className="mono-readout countdown-digit mt-2 text-4xl font-semibold">
          {capsuleCount == null ? "—" : capsuleCount.toLocaleString("ko-KR")}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {capsuleCount == null
            ? "캡슐을 세는 중…"
            : capsuleCount === 0
              ? "아직 묻힌 캡슐이 없어요. 첫 번째가 되어 보세요."
              : "지금까지 묻힌 캡슐"}
        </p>
      </div>

      {phase === "compose" ? (
        <>
          <hr className="steel-rule mx-auto mt-8 w-24" />
          <form onSubmit={beginSeal} className="mt-8 flex flex-col gap-5 text-left">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
              누구에게 남길까요?
              <input
                type="text"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                className="field"
                placeholder="미래의 나, 친구, 가족…"
              />
            </label>

            <div className="flex flex-col gap-2 text-sm font-medium text-slate-300">
              <p>언제 열까요?</p>
              <div className="flex flex-wrap gap-2">
                {DATE_PRESETS.map(({ label, days }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() =>
                      setOpenInDays((prev) => (prev === days ? null : days))
                    }
                    className={`chip ${openInDays === days ? "chip-active" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs font-normal text-slate-500">
                편지와 사진은 다음 단계에서 남길 수 있어요.
              </p>
            </div>

            <button type="submit" className="btn-primary mt-1 w-full">
              캡슐 묻기
            </button>
          </form>

          <button
            type="button"
            onClick={beginWelcomeBack}
            className="btn-ghost mt-5 text-sm"
          >
            이미 묻은 캡슐이 있어요
          </button>
        </>
      ) : null}

      {phase === "seal" ? (
        <div className="mt-8 text-left">
          <hr className="steel-rule mx-auto mb-8 w-24" />
          <p className="label-caps text-center">Ready to Seal</p>
          <h2 className="etched mt-2 text-center text-2xl font-semibold">
            이 순간을 봉인할까요?
          </h2>
          <p className="mt-3 text-center text-sm leading-relaxed text-slate-400">
            {recipient.trim()
              ? `${recipient.trim()}님에게 남길 캡슐을 안전하게 보관하려면`
              : "이 캡슐을 안전하게 보관하려면"}
            <br />
            Google 계정으로 연결해 주세요. 로그인하면 바로 편지와 사진을 남길 수
            있어요.
          </p>
          <div className="mt-8 flex justify-center">
            <GoogleLoginButton
              onClick={onGoogleLogin}
              busy={busy}
              label="Google로 봉인하기"
            />
          </div>
          {error ? <p className="alert-error mt-4">{error}</p> : null}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setPhase("compose")}
              className="btn-ghost text-sm"
            >
              조금 더 생각해 볼게요
            </button>
          </div>
        </div>
      ) : null}

      {phase === "welcome-back" ? (
        <div className="mt-8">
          <hr className="steel-rule mx-auto mb-8 w-24" />
          <p className="label-caps">Welcome Back</p>
          <h2 className="etched mt-2 text-2xl font-semibold">다시 열어볼까요?</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            로그인하면 내가 묻은 캡슐과 열람까지 남은 시간을 볼 수 있어요.
          </p>
          <div className="mt-8">
            <GoogleLoginButton onClick={onGoogleLogin} busy={busy} />
          </div>
          {error ? <p className="alert-error mt-4 text-left">{error}</p> : null}
          <button
            type="button"
            onClick={() => setPhase("compose")}
            className="btn-ghost mt-5 text-sm"
          >
            새로 묻기
          </button>
        </div>
      ) : null}
    </main>
  );
}
