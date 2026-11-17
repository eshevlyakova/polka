import { useId } from "react";
import { Illustration } from "./Illustration";
import { foodArtKind } from "./kinds";
export function FoodArt({ foodId, name }: { foodId: string; name?: string }) {
  const prefix = "food" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const kind = foodArtKind(foodId, name);
  const gradients: Record<string, [string, string]> = {
    cream: ["#fffdf2", "#e5dfca"],
    shell: ["#f3d4ab", "#c29569"],
    leaf: ["#a6ba76", "#4b7851"],
    red: ["#fa9c75", "#c7533e"],
    gold: ["#fae6a7", "#d4b460"],
    grain: ["#e5cfa2", "#c49f70"],
    rose: ["#f3d4c1", "#d89e8a"],
    orange: ["#f2c27c", "#d78e4e"],
    bowl: ["#d3dfc5", "#91ac91"],
    fish: ["#c5d7c4", "#7fa79e"],
  };
  return (
    <svg
      className="food-art"
      viewBox="0 0 96 96"
      aria-hidden="true"
      data-food-art={kind}
    >
      <defs>
        {Object.entries(gradients).map(([key, [start, end]]) => (
          <linearGradient
            key={key}
            id={`${prefix}-${key}`}
            x1="0"
            y1="0"
            x2=".85"
            y2="1"
          >
            <stop stopColor={start} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
        ))}
        <radialGradient id={`${prefix}-paper`} cx=".3" cy=".2" r="1">
          <stop stopColor="#fffdf5" />
          <stop offset="1" stopColor="#eeeddf" />
        </radialGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="94"
        height="94"
        rx="25"
        fill={`url(#${prefix}-paper)`}
        stroke="#e8e8da"
      />
      <ellipse cx="49" cy="83" rx="29" ry="5" fill="#5c7654" opacity=".08" />
      <Illustration kind={kind} prefix={prefix} />
    </svg>
  );
}
