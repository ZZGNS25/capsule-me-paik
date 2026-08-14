"use client";

import { useEffect, useState } from "react";
import { formatCountdownLabel, isCapsuleOpen } from "@/lib/capsule";

type CountdownProps = {
  openAt: string;
  className?: string;
};

export default function Countdown({ openAt, className = "" }: CountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const opened = isCapsuleOpen(openAt, now);

  return (
    <span
      className={`mono-readout text-sm font-medium ${
        opened ? "text-emerald-300" : "glow-text"
      } ${className}`}
    >
      {formatCountdownLabel(openAt, now)}
    </span>
  );
}
