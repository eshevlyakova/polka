import type { Achievement } from "../domain/achievements";

/** Small original vector characters; no emoji or external image dependencies. */
export function AchievementArt({ kind }: { kind: Achievement["id"] }) {
  return (
    <svg
      className="achievement-art"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="50" cy="88" rx="29" ry="5" fill="#35543d" opacity=".12" />
      <g
        stroke="#435c3b"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === "first" && (
          <>
            <path d="M51 29c-1-10 5-17 10-19" />
            <path d="M54 23c4-12 17-10 18-10-1 11-9 15-18 10Z" fill="#7d9c57" />
            <path
              d="M50 27c-15 0-14 18-22 28-18 24 0 33 22 33s40-9 22-33C64 45 65 27 50 27Z"
              fill="#cfdd8b"
            />
            <path d="M33 65c-4 5-3 10 1 13" stroke="#edf3c5" strokeWidth="5" />
          </>
        )}
        {kind === "week" && (
          <>
            <path
              d="M26 40c-15-12-5-27 24-27s39 15 24 27l2 39c0 5-3 7-8 7H32c-5 0-8-2-8-7Z"
              fill="#c98e58"
            />
            <path
              d="M32 43c-13-12-4-22 18-22s31 10 18 22l2 32c0 3-2 4-5 4H35c-3 0-5-1-5-4Z"
              fill="#f6dfac"
              stroke="#e7ba7b"
            />
            <path d="m43 33 15-3-1 13-15 2Z" fill="#f5c753" stroke="#d6a337" />
          </>
        )}
        {kind === "fortnight" && (
          <>
            <path
              d="M26 42c-8-14 9-24 21-22 15-18 30-1 26 13 19 8 13 25 4 30 8 18-12 27-25 20-18 9-34-1-30-17-14-8-8-20 4-24Z"
              fill="#fff8dc"
            />
            <circle cx="51" cy="54" r="21" fill="#f2bf59" stroke="#d59a3a" />
            <path d="M40 43c3-4 7-5 11-5" stroke="#ffe3a0" strokeWidth="4" />
          </>
        )}
        {kind === "cook" && (
          <>
            <path
              d="M25 46h50v24c0 11-10 16-25 16S25 81 25 70Z"
              fill="#e7a889"
            />
            <path d="M25 53H14v11h11m50-11h11v11H75" />
            <path d="M21 45h58M30 40c0-10 40-10 40 0" fill="#d6e1bb" />
            <path
              d="M45 33v-4h10v4M35 24c-8-8 5-9 0-17m15 16c-8-8 5-9 0-17m15 18c-8-8 5-9 0-17"
              stroke="#8d9e7e"
            />
          </>
        )}
        {kind === "variety" && (
          <>
            <circle cx="50" cy="52" r="35" fill="#d7e4bd" />
            <circle cx="50" cy="52" r="27" fill="#fff7df" stroke="#aabb8b" />
            <path d="M31 45c-2-17 16-18 19-5-6 10-15 13-19 5Z" fill="#8daf71" />
            <path d="M53 34c11-6 23 2 17 14-7 4-17-1-17-14Z" fill="#de9178" />
            <path d="M36 59c-6 13 16 20 22 6-1-9-14-13-22-6Z" fill="#f2cf77" />
            <path d="m71 14 3-7m7 15 7-2" stroke="#c89a42" />
          </>
        )}
        {kind === "own" && (
          <>
            <path
              d="M32 32h36l5 12v34c0 5-4 8-9 8H36c-5 0-9-3-9-8V44Z"
              fill="#dfb48d"
            />
            <path d="M31 23h38v11H31Z" fill="#7e9b6a" />
            <path d="M27 48h46v27H27Z" fill="#fff1cf" />
            <path
              d="m50 37 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z"
              fill="#edc768"
              stroke="#ba8b37"
            />
            <path d="m75 18 3-7m5 15 7-1M18 35l-5-4" stroke="#c49b4d" />
          </>
        )}
      </g>
      {kind !== "variety" && (
        <g fill="#3e5037">
          <circle cx="41" cy={kind === "cook" ? 63 : 62} r="2.2" />
          <circle cx="59" cy={kind === "cook" ? 63 : 62} r="2.2" />
          <path
            d="M46 69q4 5 8 0"
            stroke="#3e5037"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <ellipse
            cx="34"
            cy="68"
            rx="4"
            ry="2.5"
            fill="#dc8e7a"
            opacity=".55"
          />
          <ellipse
            cx="66"
            cy="68"
            rx="4"
            ry="2.5"
            fill="#dc8e7a"
            opacity=".55"
          />
        </g>
      )}
    </svg>
  );
}
