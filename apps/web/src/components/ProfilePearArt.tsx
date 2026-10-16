import { useId } from "react";

/** Original profile pose: a winking pear holding its first little star. */
export function ProfilePearArt() {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="Груша подмигивает и держит звёздочку"
    >
      <defs>
        <linearGradient id={`${id}-pear`} x1=".1" y1="0" x2=".9" y2="1">
          <stop stopColor="#e7eea3" />
          <stop offset=".55" stopColor="#c2d87e" />
          <stop offset="1" stopColor="#94b45e" />
        </linearGradient>
        <linearGradient id={`${id}-star`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffe5a0" />
          <stop offset="1" stopColor="#e9b24f" />
        </linearGradient>
        <radialGradient id={`${id}-cheek`}>
          <stop stopColor="#e8a18b" stopOpacity=".9" />
          <stop offset="1" stopColor="#e8a18b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M29 136c26-29 67-27 97-13s70 12 88-9"
        stroke="#dce6c5"
        strokeWidth="17"
        strokeLinecap="round"
        fill="none"
      />
      <g transform="translate(18 0) rotate(14 65 95)">
        <ellipse cx="65" cy="150" rx="34" ry="5" fill="#244c3c" opacity=".09" />
        <path
          d="m50 131-6 13m34-13 8 8 9-3"
          stroke="#385844"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <ellipse
          cx="42"
          cy="148"
          rx="9"
          ry="4"
          fill="#385844"
          transform="rotate(-8 42 148)"
        />
        <ellipse
          cx="98"
          cy="135"
          rx="8"
          ry="4"
          fill="#385844"
          transform="rotate(-24 98 135)"
        />
        <path
          d="M34 92C12 86 13 106 32 113M91 91c18 12 42 8 51-10"
          stroke="#385844"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
        <g transform="rotate(-9 64 83)">
          <path
            d="M67 27c-2-8 0-14 5-19"
            stroke="#795c3c"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path d="M69 24C72 9 86 6 97 9 94 23 82 28 69 24Z" fill="#638548" />
          <path
            d="m72 22 15-9"
            stroke="#b5d17c"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M64 29c-21-1-19 21-27 36-11 18-20 27-17 46 3 21 23 30 43 30s39-9 42-29c3-20-10-33-18-49-8-15-4-33-23-34Z"
            fill={`url(#${id}-pear)`}
          />
          <path
            d="M49 43c-6 9-5 17-11 26"
            stroke="#f4f6d2"
            strokeWidth="7"
            strokeLinecap="round"
            opacity=".7"
          />
          <ellipse cx="41" cy="101" rx="13" ry="9" fill={`url(#${id}-cheek)`} />
          <ellipse cx="82" cy="101" rx="13" ry="9" fill={`url(#${id}-cheek)`} />
          <ellipse cx="49" cy="88" rx="4" ry="6" fill="#294c38" />
          <circle cx="50" cy="86" r="1.4" fill="#fff" />
          <path
            d="M74 89q5-7 10-1"
            stroke="#294c38"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M55 100q8 12 17-1"
            fill="#294c38"
            stroke="#294c38"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="m60 106 6-1"
            stroke="#eeae97"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <g fill="#88a64e" opacity=".35">
            <circle cx="36" cy="118" r="1.1" />
            <circle cx="79" cy="124" r="1.1" />
            <circle cx="52" cy="128" r="1" />
          </g>
        </g>
      </g>
      <g transform="translate(65 42) rotate(10 112 45)">
        <path
          d="m112 21 7 14 15 2-11 11 3 16-14-8-14 8 3-16-11-11 15-2Z"
          fill={`url(#${id}-star)`}
          stroke="#ca9845"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="m105 40 5-1 3-6"
          stroke="#fff2c7"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="114" cy="62" r="5" fill="#385844" />
        <path
          d="m93 18-3-5m36 0 3-5m7 18 3-1"
          stroke="#d6ae61"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
      <path d="m21 51 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z" fill="#dfbe76" />
    </svg>
  );
}
