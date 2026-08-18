import type { CapsuleShape } from "@/lib/gemini";

type WeatherCapsuleProps = {
  shape?: string | null;
  color?: string | null;
  colorAlt?: string | null;
  sealed?: boolean;
  size?: "sm" | "md" | "lg";
};

const SIZE = {
  sm: "h-24 w-20",
  md: "h-36 w-28",
  lg: "h-52 w-40",
};

export default function WeatherCapsule({
  shape,
  color,
  colorAlt,
  sealed = true,
  size = "sm",
}: WeatherCapsuleProps) {
  const fill = color || "#38bdf8";
  const fillAlt = colorAlt || "#0ea5e9";
  const resolvedShape = (shape || "orb") as CapsuleShape;
  const id = `${resolvedShape}-${fill.replace("#", "")}`;

  return (
    <div
      className={`relative ${SIZE[size]} shrink-0`}
      style={{ filter: `drop-shadow(0 0 14px ${fill}66)` }}
    >
      <svg viewBox="0 0 80 104" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`g-${id}`} x1="18%" y1="0%" x2="86%" y2="100%">
            <stop offset="0%" stopColor={fillAlt} />
            <stop offset="45%" stopColor={fill} />
            <stop offset="100%" stopColor="#0b1220" />
          </linearGradient>
          <radialGradient id={`shine-${id}`} cx="32%" cy="22%" r="55%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <CapsulePath shape={resolvedShape} fill={`url(#g-${id})`} />
        <CapsulePath
          shape={resolvedShape}
          fill={`url(#shine-${id})`}
          opacity={0.9}
        />
      </svg>
      {sealed ? (
        <span className="absolute inset-x-0 bottom-1 text-center font-mono text-[9px] tracking-[0.22em] text-white/80">
          SEALED
        </span>
      ) : null}
    </div>
  );
}

function CapsulePath({
  shape,
  fill,
  opacity = 1,
}: {
  shape: CapsuleShape;
  fill: string;
  opacity?: number;
}) {
  const common = {
    fill,
    opacity,
    stroke: "rgba(6,9,12,0.85)",
    strokeWidth: 1.4,
  };

  switch (shape) {
    case "raindrop":
      return (
        <path
          d="M40 8 C40 8 14 42 14 64 C14 80 26 94 40 94 C54 94 66 80 66 64 C66 42 40 8 40 8 Z"
          {...common}
        />
      );
    case "snow":
      return <ellipse cx="40" cy="54" rx="28" ry="34" {...common} />;
    case "sun":
      return (
        <g>
          <circle cx="40" cy="52" r="26" {...common} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = 40 + Math.cos(rad) * 30;
            const y1 = 52 + Math.sin(rad) * 30;
            const x2 = 40 + Math.cos(rad) * 38;
            const y2 = 52 + Math.sin(rad) * 38;
            return (
              <line
                key={deg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={fill === `url(#shine-${shape})` ? "transparent" : "#fde68a"}
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            );
          })}
        </g>
      );
    case "cloud":
      return (
        <path
          d="M24 70 C14 70 12 56 22 52 C22 38 38 32 46 42 C54 28 74 34 72 50 C82 54 80 72 68 72 Z"
          {...common}
        />
      );
    case "storm":
      return (
        <path
          d="M18 30 L40 8 L64 28 L70 58 L52 96 L28 92 L12 60 Z"
          {...common}
        />
      );
    case "mist":
      return (
        <ellipse cx="40" cy="54" rx="30" ry="26" {...common} />
      );
    default:
      return (
        <path
          d="M24 28 C24 16 32 8 40 8 C48 8 56 16 56 28 L56 76 C56 88 48 96 40 96 C32 96 24 88 24 76 Z"
          {...common}
        />
      );
  }
}
