"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { CAPSULE_BUCKET, supabase } from "@/lib/supabase";
import AppHeader from "@/components/AppHeader";

type CapsuleResult = {
  id: string;
  recipient: string;
  openAt: string;
  photoUrls: string[];
};

export default function NewCapsulePage() {
  const [user, setUser] = useState<User | null>(null);
  const [recipient, setRecipient] = useState("");
  const [letter, setLetter] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CapsuleResult | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
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
    setFiles(selected ? Array.from(selected) : []);
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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const currentUser = auth.currentUser ?? user;
    if (!currentUser) {
      setErrorMessage("로그인 후 캡슐을 묻을 수 있어요.");
      return;
    }

    if (files.length === 0) {
      setErrorMessage("사진을 한 장 이상 골라 주세요.");
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

        const { error } = await supabase.storage
          .from(CAPSULE_BUCKET)
          .upload(path, file, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });

        if (error) {
          throw error;
        }

        const { data } = supabase.storage
          .from(CAPSULE_BUCKET)
          .getPublicUrl(path);

        photoPaths.push(path);
        photoUrls.push(data.publicUrl);
      }

      const { data, error } = await supabase
        .from("capsules")
        .insert({
          owner_uid: currentUser.uid,
          recipient,
          title: recipient,
          letter,
          open_at: new Date(openAt).toISOString(),
          photo_paths: photoPaths,
        })
        .select("id, recipient, open_at")
        .single();

      if (error) {
        throw error;
      }

      setResult({
        id: data.id,
        recipient: data.recipient ?? recipient,
        openAt: data.open_at,
        photoUrls,
      });
      setFiles([]);
    } catch (error) {
      console.error(error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const openDateLabel = new Date(result.openAt).toLocaleString("ko-KR", {
      dateStyle: "long",
      timeStyle: "short",
    });

    return (
      <div className="min-h-full flex-1 bg-gradient-to-b from-slate-100 via-sky-50 to-stone-100 px-6 py-10">
        <div className="mx-auto w-full max-w-3xl">
          <AppHeader />
          <main className="mx-auto mt-10 w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white/90 px-8 py-10 text-center shadow-sm backdrop-blur-sm">
            <p className="text-sm tracking-[0.2em] text-slate-400">CAPSULE ME</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-800">
              캡슐을 묻었어요
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {result.recipient}님에게 전할 이야기가 안전하게 보관되었습니다.
              <br />
              열람일은 {openDateLabel}입니다.
            </p>

            <div className="mt-8 rounded-2xl bg-slate-50 px-5 py-5 text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Capsule ID
              </p>
              <p className="mt-1 break-all font-mono text-sm text-slate-700">
                {result.id}
              </p>

              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">
                Photos
              </p>
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
                      className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200 transition group-hover:ring-slate-400"
                    />
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                보드에서 보기
              </Link>
              <Link
                href={`/capsule/${result.id}`}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                캡슐 상세
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                하나 더 묻기
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex-1 bg-gradient-to-b from-slate-100 via-sky-50 to-stone-100 px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <AppHeader />
        <main className="mx-auto mt-10 w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white/80 px-8 py-10 shadow-sm backdrop-blur-sm">
          <h1 className="text-center text-3xl font-semibold tracking-tight text-slate-800">
            캡슐 묻기
          </h1>
          <p className="mt-3 text-center text-sm text-slate-500">
            편지와 사진을 남기고, 정해진 날에 함께 열어보세요.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-left text-sm text-slate-600">
              받는 사람
              <input
                type="text"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-slate-400"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-left text-sm text-slate-600">
              편지
              <textarea
                value={letter}
                onChange={(event) => setLetter(event.target.value)}
                rows={6}
                className="resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-slate-400"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-left text-sm text-slate-600">
              열람일
              <input
                type="datetime-local"
                value={openAt}
                onChange={(event) => setOpenAt(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-slate-400"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-left text-sm text-slate-600">
              사진
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => handleFilesChange(event.target.files)}
                className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-700"
              />
            </label>

            {previewUrls.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {previewUrls.map((url, index) => (
                  <img
                    key={`${url}-${index}`}
                    src={url}
                    alt={`선택한 사진 ${index + 1}`}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                ))}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-xl bg-slate-800 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "묻는 중..." : "캡슐 묻기"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
