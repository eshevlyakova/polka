import type { FoodArtKind } from "./kinds";

/** Pantry miniatures drawn for the existing Polka palette; geometry stays sharp at any scale. */
export function Illustration({
  kind,
  prefix,
}: {
  kind: FoodArtKind;
  prefix: string;
}) {
  const paint = (name: string) => `url(#${prefix}-${name})`;
  switch (kind) {
    case "egg":
      return (
        <>
          <path
            d="M19 62C7 54 15 24 28 21c14-3 28 27 19 39-6 9-20 11-28 2Z"
            fill={paint("shell")}
            stroke="#c3a27f"
            strokeWidth="1.1"
          />
          <path
            d="M22 31c-5 7-6 13-5 18"
            fill="none"
            stroke="#fff2dc"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M49 69c-13-8-7-37 5-43 14-7 35 22 28 36-5 11-22 15-33 7Z"
            fill={paint("cream")}
            stroke="#ded5c1"
            strokeWidth="1.2"
          />
          <ellipse
            cx="58"
            cy="66"
            rx="24"
            ry="15"
            transform="rotate(-13 58 66)"
            fill="#fffef4"
            stroke="#e0d8bf"
            strokeWidth="1.2"
          />
          <ellipse cx="59" cy="65" rx="12" ry="10" fill={paint("gold")} />
          <ellipse cx="55" cy="62" rx="4" ry="2.5" fill="#fff0ad" />
          <path
            d="m57 40 3-2m9 5 2 1m-16 8 2 1"
            stroke="#dbd2b8"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </>
      );
    case "tomato":
      return (
        <>
          <path
            d="M16 41c-3-15 15-25 27-19 16-6 28 8 24 25-4 18-17 25-31 22-16-2-21-15-20-28Z"
            fill={paint("red")}
            stroke="#b84d37"
            strokeWidth="1.2"
          />
          <path
            d="M25 35c-4 6-5 12-3 18"
            fill="none"
            stroke="#ffb89a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="m42 26-12-8 12 3 7-11-1 13 12 3-13 4-3 10-4-11-12 2Z"
            fill={paint("leaf")}
            stroke="#527641"
            strokeWidth="1"
          />
          <circle
            cx="66"
            cy="62"
            r="20"
            fill={paint("red")}
            stroke="#b84d37"
            strokeWidth="1.2"
          />
          <path
            d="m65 44-6-6 7 3 5-6-1 9 9 4-11-1-4 6-1-7-8 1Z"
            fill="#587b43"
          />
          <path
            d="M55 57c-2 3-3 6-2 9"
            stroke="#ffb28e"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    case "cucumber":
      return (
        <>
          <path
            d="M18 66 57 21c6-6 18 1 18 9L36 76c-8 8-23-2-18-10Z"
            fill={paint("leaf")}
            stroke="#416943"
            strokeWidth="1.5"
          />
          <path
            d="m24 63 33-36m-25 41 34-36"
            stroke="#a8be75"
            strokeWidth="2.7"
            strokeLinecap="round"
          />
          {[28, 38, 48, 58].map((x, i) => (
            <path
              key={x}
              d={`m${x} ${68 - i * 10} 1-2`}
              stroke="#325d36"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
          <g transform="rotate(18 66 65)">
            <ellipse cx="66" cy="66" rx="18" ry="13" fill="#688c4e" />
            <ellipse
              cx="66"
              cy="63"
              rx="18"
              ry="13"
              fill="#d4dea3"
              stroke="#779657"
              strokeWidth="1.5"
            />
            <ellipse cx="66" cy="63" rx="12" ry="8" fill="#edf0c8" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <ellipse
                key={i}
                cx={66 + 7 * Math.cos((i * Math.PI) / 3)}
                cy={63 + 4 * Math.sin((i * Math.PI) / 3)}
                rx="1.3"
                ry="2.2"
                transform={`rotate(${i * 60} ${66 + 7 * Math.cos((i * Math.PI) / 3)} ${63 + 4 * Math.sin((i * Math.PI) / 3)})`}
                fill="#b4c58a"
              />
            ))}
          </g>
        </>
      );
    case "banana":
      return (
        <>
          <path
            d="M22 22c-8 35 15 49 47 23-12 27-40 38-53 18-8-13-5-29 0-41Z"
            fill={paint("gold")}
            stroke="#bd963f"
            strokeWidth="1.3"
          />
          <path
            d="M30 20c-7 31 13 43 45 18-11 25-36 36-49 22-12-12-9-26-3-40Z"
            fill="#f2d47a"
            stroke="#c9a44e"
            strokeWidth="1.1"
          />
          <path
            d="M29 28c-3 22 12 31 34 19"
            fill="none"
            stroke="#fff0b5"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="m19 24 2-10 9 2-1 8" fill="#697d49" stroke="#52613e" />
          <path
            d="m70 45 5-7 3 3-5 7m-7 6 4-5"
            stroke="#937044"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      );
    case "milk":
      return (
        <>
          <path
            d="m27 24 12-12 28 4 11 15v47L53 84l-27-8Z"
            fill={paint("cream")}
            stroke="#c1cabc"
            strokeWidth="1.3"
          />
          <path d="m39 12 15 17 24 2-11-15Z" fill="#a0babb" />
          <path d="M54 29v55l24-6V31Z" fill="#dbe5dd" />
          <path d="m27 45 27 5 24-5v20l-24 6-28-6Z" fill="#6e9a8a" />
          <path d="m54 50 24-5v20l-24 6Z" fill="#557e71" />
          <path
            d="m32 26 15 3m-14 6 12 2"
            stroke="#fffef8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="61" cy="25" r="5" fill="#f7fcf6" stroke="#adc2b6" />
          <path d="M38 58c-5-5-1-7 0-10 2 4 6 6 0 10" fill="#f4f5dc" />
        </>
      );
    case "yogurt":
      return (
        <>
          <path
            d="m24 32 5 44c1 10 38 10 40 0l5-44Z"
            fill={paint("cream")}
            stroke="#cad4bd"
            strokeWidth="1.2"
          />
          <path
            d="m27 48 3 22c9 5 28 6 38 0l3-22c-12 5-31 5-44 0Z"
            fill="#b0c59a"
          />
          <ellipse
            cx="49"
            cy="31"
            rx="27"
            ry="10"
            fill="#e1e8cd"
            stroke="#a7ba91"
            strokeWidth="1.4"
          />
          <ellipse cx="49" cy="30" rx="21" ry="6" fill="#fffdf3" />
          <path
            d="M47 27c13-8 23-16 27-24 0 18-5 24-18 27"
            fill="#e8ecde"
            stroke="#b6c4ac"
            strokeWidth="1.1"
          />
          <path d="m39 59 7-3 11 3-10 6Z" fill="#f8faee" />
          <path
            d="M34 36v7"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      );
    case "cottage":
      return (
        <>
          <ellipse cx="48" cy="44" rx="33" ry="16" fill="#e0d7c0" />
          <path
            d="M15 43c2 29 14 37 33 37s31-8 33-37Z"
            fill={paint("bowl")}
            stroke="#97ac8c"
            strokeWidth="1.2"
          />
          <ellipse
            cx="48"
            cy="43"
            rx="33"
            ry="14"
            fill="#f9f6e9"
            stroke="#bbc6a9"
            strokeWidth="1.5"
          />
          {[
            [-18, 0],
            [-8, -5],
            [2, -7],
            [15, -1],
            [8, 4],
            [-4, 5],
            [-15, 5],
            [20, 5],
          ].map(([x, y], i) => (
            <ellipse
              key={i}
              cx={48 + x}
              cy={43 + y}
              rx={i % 2 ? 7 : 5}
              ry={i % 2 ? 5 : 3.5}
              fill={i % 2 ? "#fffef7" : "#e8dfc6"}
              stroke="#e7dfca"
              strokeWidth=".8"
            />
          ))}
          <path
            d="M54 29c-1-12 14-16 20-12-2 10-9 16-20 12Z"
            fill={paint("leaf")}
          />
          <path d="m56 28 12-7" stroke="#c3d5a1" strokeWidth="1.2" />
          <path
            d="M27 59c3 7 7 10 13 12"
            stroke="#d8e1cc"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    case "cheese":
      return (
        <>
          <path
            d="m17 37 46-19 20 24-42 17Z"
            fill="#f7dda1"
            stroke="#d7b466"
            strokeWidth="1.2"
          />
          <path
            d="m17 37 24 22v23L16 62Z"
            fill="#dfb15d"
            stroke="#c7a15a"
            strokeWidth="1.2"
          />
          <path
            d="m41 59 42-17v23L41 82Z"
            fill={paint("gold")}
            stroke="#c7a15a"
            strokeWidth="1.2"
          />
          <ellipse cx="50" cy="35" rx="5" ry="3" fill="#e5bf6b" />
          <ellipse cx="65" cy="43" rx="4" ry="2.7" fill="#e5bf6b" />
          <ellipse cx="60" cy="65" rx="5" ry="6" fill="#d1a54e" />
          <ellipse cx="75" cy="56" rx="3" ry="4" fill="#d1a54e" />
          <path d="m43 77 34-14" stroke="#ffe7ab" strokeWidth="2" />
        </>
      );
    case "chicken":
      return (
        <>
          <rect x="11" y="20" width="76" height="63" rx="16" fill="#c9c9b4" />
          <rect
            x="13"
            y="17"
            width="72"
            height="63"
            rx="14"
            fill="#efeddf"
            stroke="#d4d6c6"
            strokeWidth="1.2"
          />
          <path
            d="M24 56c-9-15 6-35 22-31 13 4 20 27 10 36-11 9-25 9-32-5Z"
            fill={paint("rose")}
            stroke="#d3a08c"
            strokeWidth="1.2"
          />
          <path
            d="M43 62c-3-16 11-32 26-24 15 9 14 28 4 33-11 5-24 3-30-9Z"
            fill={paint("rose")}
            stroke="#cf9a87"
            strokeWidth="1.2"
          />
          <path
            d="M31 36c10-4 18 4 20 15m2 2c7-8 15-5 18 7"
            fill="none"
            stroke="#fae1d0"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="m20 75 15-6m-8 2-1-5m5 3 2-5m-9 7-1 5"
            stroke="#73905a"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      );
    case "oil":
      return (
        <>
          <path
            d="M38 12h21v19c0 6 11 7 12 17v32c-13 7-34 7-47 0V48c1-10 14-11 14-17Z"
            fill="#d6ddaa"
            stroke="#9fae74"
            strokeWidth="1.2"
          />
          <path
            d="M27 50h41v27c-11 7-28 7-41 0Z"
            fill={paint("gold")}
            opacity=".9"
          />
          <rect x="36" y="9" width="25" height="12" rx="3" fill="#4c6f49" />
          <path d="m42 12 0 6m6-6v6m6-6v6" stroke="#789469" strokeWidth="1.2" />
          <path
            d="M31 44c1-6 12-8 12-14V23"
            stroke="#fff9ce"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="28" y="53" width="37" height="21" rx="5" fill="#f7f0d8" />
          <path
            d="m39 69 17-13m-11 8c-8-2-9-7-6-9 6 0 8 3 6 9m4-3c-1-7 5-9 9-7 1 6-3 8-9 7"
            fill="#6d8751"
            stroke="#6d8751"
            strokeWidth=".8"
          />
        </>
      );
    case "rice":
      return (
        <>
          <path
            d="M23 30h50v46c0 11-50 11-50 0Z"
            fill="#edf0e4"
            fillOpacity=".8"
            stroke="#bccab6"
            strokeWidth="1.5"
          />
          <ellipse cx="48" cy="30" rx="25" ry="7" fill="#e7ead8" />
          <path d="M26 43c11-5 34-5 44 0v32c-11 7-33 7-44 0Z" fill="#f0e6ce" />
          {Array.from({ length: 22 }, (_, i) => (
            <ellipse
              key={i}
              cx={31 + (i % 5) * 8 + (i % 2) * 2}
              cy={46 + Math.floor(i / 5) * 7}
              rx="3"
              ry="1.5"
              transform={`rotate(${i % 2 ? 28 : -24} ${31 + (i % 5) * 8 + (i % 2) * 2} ${46 + Math.floor(i / 5) * 7})`}
              fill={i % 3 ? "#fffbee" : "#ded1b3"}
            />
          ))}
          <rect
            x="22"
            y="19"
            width="52"
            height="13"
            rx="5"
            fill="#a6b58c"
            stroke="#889b73"
          />
          <path
            d="M30 21h35"
            stroke="#c7d3b0"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M30 36v16"
            stroke="#fff"
            opacity=".7"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      );
    case "oats":
      return (
        <>
          <path
            d="m27 17 42-2 6 62-52 3Z"
            fill={paint("grain")}
            stroke="#b8a176"
            strokeWidth="1.3"
          />
          <path
            d="m27 17 5 9 36-2 1-9m-37 9-7 51 8-3"
            fill="#e2c68e"
            stroke="#bc9f69"
            strokeWidth="1"
          />
          <rect x="34" y="34" width="30" height="31" rx="8" fill="#f8f2df" />
          <path
            d="M48 61V39m0 13-9-6m9 11 9-6"
            stroke="#a8a068"
            strokeWidth="1.5"
          />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <ellipse
                cx="43"
                cy={42 + i * 6}
                rx="2.7"
                ry="5"
                transform={`rotate(-42 43 ${42 + i * 6})`}
                fill="#c8b773"
              />
              <ellipse
                cx="53"
                cy={40 + i * 6}
                rx="2.7"
                ry="5"
                transform={`rotate(42 53 ${40 + i * 6})`}
                fill="#d3c78b"
              />
            </g>
          ))}
          <path
            d="m68 78 8 3m-55-4-5 3"
            stroke="#d8c08a"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      );
    case "pasta":
      return (
        <>
          {[
            [28, 34, -25],
            [49, 27, 18],
            [62, 48, -23],
            [35, 61, 25],
            [60, 72, 12],
          ].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <path
                d="M-17-5h31v11h-31Z"
                fill={paint("gold")}
                stroke="#c5a052"
                strokeWidth="1"
              />
              <ellipse
                cx="-17"
                cy=".5"
                rx="4"
                ry="5.5"
                fill="#fae9ad"
                stroke="#c5a052"
              />
              <ellipse cx="-17" cy=".5" rx="2.2" ry="3.3" fill="#b28d47" />
              <path
                d="M-10-3h22m-22 4h22m-22 3h22"
                stroke="#f8e1a0"
                strokeWidth="1"
              />
            </g>
          ))}
        </>
      );
    case "apple":
      return (
        <>
          <path
            d="M47 29C21 9 9 41 18 62c8 22 22 19 30 15 11 5 23 2 29-17 8-22-2-44-29-31Z"
            fill={paint("red")}
            stroke="#bc6145"
            strokeWidth="1.2"
          />
          <path
            d="M48 32c-3-10 0-17 6-21"
            stroke="#806143"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M53 23c1-13 14-16 23-12-2 11-13 15-23 12Z"
            fill={paint("leaf")}
          />
          <path
            d="M27 32c-7 7-8 15-6 22"
            stroke="#ffcba1"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path d="m45 73 3-3 3 3" stroke="#a14938" fill="none" />
        </>
      );
    case "bread":
      return (
        <>
          <path
            d="M15 57V44c0-29 58-34 66-3l1 20c-16 15-54 19-67-4Z"
            fill={paint("grain")}
            stroke="#ac7b49"
            strokeWidth="1.3"
          />
          <path
            d="M25 34c3-6 6-8 11-9m4 9c3-7 7-11 12-12m3 12c3-5 7-8 11-8"
            stroke="#f6dfb3"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M17 59c18 9 43 6 62-3"
            stroke="#bb8c50"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M43 59c-1-15 29-23 35-8l5 21c-9 12-26 16-36 9Z"
            fill="#e0b37b"
            stroke="#aa7c4f"
          />
          <path
            d="M48 60c-1-10 20-17 25-7l4 17c-7 8-19 12-25 7Z"
            fill="#f4e1bd"
          />
          {[
            [57, 63],
            [65, 59],
            [69, 71],
            [57, 73],
          ].map(([x, y]) => (
            <circle key={x + y} cx={x} cy={y} r="1.5" fill="#d8bd8d" />
          ))}
        </>
      );
    case "carrot":
      return (
        <>
          <g transform="rotate(24 48 48)">
            <path
              d="M34 26c18-9 28-1 21 16L37 82c-3 6-5 4-5-2l-3-39c-1-7-1-11 5-15Z"
              fill={paint("orange")}
              stroke="#c18348"
              strokeWidth="1.2"
            />
            <path
              d="m34 38 9 1m-10 9 7 1m-6 9 6 1m-5 9 4 1"
              stroke="#d49048"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M41 26C17 13 22 7 30 10l11 13C34 1 44 0 47 22 55 3 64 8 50 26Z"
              fill={paint("leaf")}
            />
          </g>
          <path d="m59 59 16 13-14 10-11-15Z" fill="#edb069" stroke="#cc914e" />
          <ellipse
            cx="63"
            cy="65"
            rx="10"
            ry="7"
            transform="rotate(40 63 65)"
            fill="#f5cb8a"
            stroke="#d39e58"
          />
          <ellipse
            cx="63"
            cy="65"
            rx="5"
            ry="3"
            transform="rotate(40 63 65)"
            fill="#e7a861"
          />
        </>
      );
    case "fish":
      return (
        <>
          <path d="M21 51 8 34l1 32Z" fill="#6c9790" stroke="#4d7b77" />
          <path
            d="M18 50C36 22 68 21 86 47 68 74 36 76 18 50Z"
            fill={paint("fish")}
            stroke="#668d85"
            strokeWidth="1.2"
          />
          <path
            d="m43 30 13-11 6 10m-19 37 13 9 5-9"
            fill="#91b2a4"
            stroke="#6f968a"
          />
          <path
            d="M66 31c-8 12-8 23 0 34"
            fill="none"
            stroke="#668c83"
            strokeWidth="1.2"
          />
          <circle cx="75" cy="43" r="3" fill="#345d57" />
          <circle cx="76" cy="42" r="1" fill="#fff" />
          <path
            d="m34 40 3 5-3 5m9-12 3 5-3 5m9-11 3 5-3 5m-16 5 3 5-3 5m9-9 3 5-3 5"
            fill="none"
            stroke="#c4dbcb"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      );
    case "greens":
      return (
        <>
          {[
            [-22, -18, -36],
            [0, -23, 0],
            [20, -12, 32],
            [-12, 4, -22],
            [14, 6, 29],
          ].map(([x, y, r], i) => (
            <g
              key={i}
              transform={`translate(${48 + x} ${45 + y}) rotate(${r})`}
            >
              <path
                d="M0 19c-18-2-17-24-2-31 14 5 21 24 2 31Z"
                fill={i % 2 ? paint("leaf") : "#8ba76b"}
                stroke="#608453"
                strokeWidth="1"
              />
              <path
                d="M0 26V-6m0 9-7-5m7 13 8-7"
                fill="none"
                stroke="#c8d7a2"
                strokeWidth="1.1"
              />
            </g>
          ))}
          <path
            d="m40 66 6 17m7-16-4 17m9-18-7 18"
            stroke="#82985d"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="m40 74 17-1" stroke="#d1b17b" strokeWidth="4" />
        </>
      );
    case "potato":
      return (
        <>
          {[
            [35, 40, -25],
            [62, 54, 20],
            [34, 67, -4],
          ].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <ellipse
                rx={i === 0 ? 20 : 19}
                ry={i === 0 ? 26 : 17}
                fill={paint("grain")}
                stroke="#b2946b"
                strokeWidth="1.2"
              />
              <path
                d="M-11-13c-4 4-5 8-5 13"
                stroke="#f3ddaf"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              {[
                [-7, 5],
                [4, -8],
                [9, 6],
                [-3, -12],
              ].map(([a, b]) => (
                <path
                  key={a + b}
                  d={`m${a} ${b} 2 1`}
                  stroke="#ac8e67"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              ))}
            </g>
          ))}
        </>
      );
    case "mushroom":
      return (
        <>
          <path
            d="m34 42-6 34c10 8 22 6 28 0L49 42Z"
            fill={paint("cream")}
            stroke="#cdbfa7"
            strokeWidth="1.2"
          />
          <path
            d="M13 45c1-37 59-45 66-2 0 14-67 16-66 2Z"
            fill={paint("grain")}
            stroke="#bda078"
            strokeWidth="1.3"
          />
          <ellipse cx="46" cy="44" rx="30" ry="9" fill="#e9d9bd" />
          <path
            d="m20 44 21 3m-14-8 17 6m25-3-21 5m15-10-15 8"
            stroke="#c6b497"
            strokeWidth="1"
          />
          <path
            d="M24 29c5-8 11-11 17-11"
            stroke="#f9ead0"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path d="m66 62-2 18 12 1-3-20" fill="#ede3ce" stroke="#cbbca1" />
          <path
            d="M54 62c2-21 28-22 32-1 0 7-32 7-32 1Z"
            fill="#c6aa82"
            stroke="#b69a75"
          />
        </>
      );
    case "berries":
      return (
        <>
          <path
            d="M17 41c0-21 34-22 38-1 1 14-14 34-19 34-6 0-20-21-19-33Z"
            fill={paint("red")}
            stroke="#b65345"
            strokeWidth="1.1"
          />
          <path
            d="m35 24-9-9 11 5 8-8-2 11 9 4-12 1-5 8-3-9-12 3Z"
            fill="#6d8b4f"
          />
          {[
            [28, 37],
            [39, 35],
            [24, 46],
            [35, 45],
            [44, 46],
            [30, 55],
            [38, 56],
            [34, 64],
          ].map(([x, y]) => (
            <path
              key={x + y}
              d={`m${x} ${y} 0 2`}
              stroke="#ffd5a0"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          ))}
          {[
            [64, 46],
            [72, 66],
            [54, 70],
          ].map(([x, y]) => (
            <g key={x + y}>
              <circle
                cx={x}
                cy={y}
                r="13"
                fill="#7f93aa"
                stroke="#61788c"
                strokeWidth="1"
              />
              <circle cx={x - 4} cy={y - 4} r="4" fill="#a9bdce" opacity=".7" />
              <path d={`m${x - 3} ${y + 2} 3-3 3 3-3 2Z`} fill="#50697f" />
            </g>
          ))}
        </>
      );
    case "lemon":
      return (
        <>
          <path
            d="M14 32c7-24 44-20 52 3 12 5 11 10-1 13-12 25-43 20-51-2-9-5-9-9 0-14Z"
            fill={paint("gold")}
            stroke="#c9ab58"
            strokeWidth="1.2"
          />
          <path
            d="M24 26c6-6 12-7 18-5"
            stroke="#fff1b4"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="62" cy="65" r="23" fill="#e6c86d" stroke="#beaa61" />
          <circle cx="62" cy="65" r="19" fill="#fff4c4" />
          {Array.from({ length: 7 }, (_, i) => (
            <path
              key={i}
              d="M62 64 65 49q14 6 11 17Z"
              transform={`rotate(${(i * 360) / 7} 62 65)`}
              fill="#eed47e"
              stroke="#fbefbb"
              strokeWidth="1.5"
            />
          ))}
          <circle cx="62" cy="65" r="3" fill="#fff4ce" />
        </>
      );
    case "beans":
      return (
        <>
          {[
            [29, 32, -30],
            [58, 28, 24],
            [70, 57, -15],
            [39, 64, 30],
            [24, 60, -22],
          ].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <path
                d="M-12-7c2-13 23-12 24 2 2 12-12 23-21 15-5-4-7-10-3-17Z"
                fill={i % 2 ? "#b9876c" : "#8f6256"}
                stroke="#7e594d"
                strokeWidth="1"
              />
              <path
                d="M-5-6c5-4 9-1 8 4"
                stroke="#dfb49a"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ))}
        </>
      );
    default:
      return (
        <>
          <path
            d="M24 29h49v46c0 11-49 11-49 0Z"
            fill={paint("cream")}
            stroke="#c0c6ae"
            strokeWidth="1.3"
          />
          <rect
            x="22"
            y="17"
            width="53"
            height="14"
            rx="5"
            fill="#8da781"
            stroke="#6f8c65"
          />
          <path
            d="M30 21h36"
            stroke="#b7c9a8"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="29"
            y="44"
            width="39"
            height="23"
            rx="8"
            fill="#f2e4c1"
            stroke="#d9c89d"
          />
          <path
            d="M49 62V47m0 7-7-4m7 9 7-5"
            stroke="#a0a16a"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M29 36v7"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      );
  }
}
