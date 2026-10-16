import { useId, type ReactNode } from "react";
import { ProfilePearArt } from "./ProfilePearArt";
/** Original scalable illustration, not a platform emoji. */
export function PearMascot({
  compact = false,
  pose = "welcome",
  message = (
    <>
      Вкусного
      <br />
      дня!
    </>
  ),
}: {
  compact?: boolean;
  pose?: "welcome" | "proud";
  message?: ReactNode;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <div
      className={`mascot ${compact ? "compact" : ""} ${pose === "proud" ? "mascot-proud" : ""}`}
    >
      <span className="mascot-bubble">{message}</span>
      {pose === "proud" ? (
        <ProfilePearArt />
      ) : (
        <svg
          viewBox="0 0 140 160"
          role="img"
          aria-label="Груша — помощник Полки"
        >
          <defs>
            <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="1" y2=".8">
              <stop stopColor="#e0ed9b" />
              <stop offset=".55" stopColor="#bdd575" />
              <stop offset="1" stopColor="#8fb452" />
            </linearGradient>
            <radialGradient id={`${id}-blush`}>
              <stop stopColor="#efb299" stopOpacity=".8" />
              <stop offset="1" stopColor="#efb299" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse
            cx="74"
            cy="149"
            rx="34"
            ry="5"
            fill="#244c3c"
            opacity=".08"
          />
          <path
            d="M59 133l-6 13m35-13 5 13"
            fill="none"
            stroke="#244c3c"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <ellipse cx="51" cy="148" rx="8" ry="4" fill="#244c3c" />
          <ellipse cx="97" cy="148" rx="8" ry="4" fill="#244c3c" />
          <path
            d="M40 95C26 101 27 85 21 78M105 95c14 6 17-5 18-14"
            fill="none"
            stroke="#385844"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="20" cy="76" r="5" fill="#385844" />
          <circle cx="123" cy="80" r="5" fill="#385844" />
          <path
            d="M75 22c-3-8-1-12 2-16"
            fill="none"
            stroke="#795c3c"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path d="M78 20C81 3 96 2 104 3c-3 13-12 22-26 17" fill="#547d42" />
          <path d="M80 19L96 8" stroke="#a7c676" strokeWidth="1.5" />
          <path
            d="M73 24C48 21 52 45 44 62c-8 17-22 33-13 55 7 19 26 23 42 23s34-4 41-23c8-23-6-39-14-56C92 44 96 25 73 24Z"
            fill={`url(#${id}-skin)`}
          />
          <path
            d="M58 39c-6 10-4 17-10 28"
            fill="none"
            stroke="#eef5c6"
            strokeWidth="7"
            strokeLinecap="round"
            opacity=".65"
          />
          <ellipse cx="51" cy="99" rx="13" ry="10" fill={`url(#${id}-blush)`} />
          <ellipse cx="94" cy="99" rx="13" ry="10" fill={`url(#${id}-blush)`} />
          <ellipse cx="58" cy="86" rx="4" ry="6" fill="#294c38" />
          <ellipse cx="87" cy="86" rx="4" ry="6" fill="#294c38" />
          <circle cx="59" cy="84" r="1.4" fill="#fff" />
          <circle cx="88" cy="84" r="1.4" fill="#fff" />
          <path
            d="M66 97q7 8 14 0"
            fill="#244c3c"
            stroke="#244c3c"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M70 102h6"
            stroke="#eaad99"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <g fill="#88a64e" opacity=".3">
            <circle cx="48" cy="116" r="1" />
            <circle cx="94" cy="123" r="1" />
            <circle cx="60" cy="125" r="1" />
            <circle cx="98" cy="109" r="1" />
          </g>
        </svg>
      )}
    </div>
  );
}
