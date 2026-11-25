import type { ReceiptItem } from "../../../../shared/receipt";
import type { Food } from "./model";
import { receiptDrafts } from "./receipt";
import { foodMeasures } from "./measures";

/** Reuse explicit household estimates; never ask AI to guess weights. */
export function voiceDrafts(items: ReceiptItem[], catalog: Food[]) {
  return receiptDrafts(items, catalog).map((row) => {
    const item = row.recognized;
    if (row.grams || !item.quantity || !row.foodId || item.packageSize !== null)
      return row;
    const food = row.options.find((f) => f.id === row.foodId);
    const measures = foodMeasures(food);
    const unit =
      item.unit === "pcs"
        ? "piece"
        : ["ml", "l"].includes(item.unit ?? "")
          ? "ml"
          : "";
    const measure = measures.find((m) => m.id === unit);
    if (!measure) return row;
    const amount = item.quantity * (item.unit === "l" ? 1000 : 1);
    const grams = Math.round(amount * measure.grams);
    if (grams < 0.1 || grams > 100000) return row;
    return {
      ...row,
      grams: String(grams),
      quantityHint: `≈ ${grams.toLocaleString("ru")} г · ${item.quantity.toLocaleString("ru")} ${item.unit === "pcs" ? "шт." : item.unit === "l" ? "л" : "мл"}. По средней мере — можно изменить.`,
    };
  });
}

/** Reconcile whole-list AI responses without overwriting edits made in the live list. */
export function mergeVoiceDrafts(
  next: ReturnType<typeof voiceDrafts>,
  previous: ReturnType<typeof voiceDrafts>,
  current: ReturnType<typeof voiceDrafts>,
) {
  const key = (name: string) =>
    name
      .toLocaleLowerCase("ru")
      .replace(/ё/g, "е")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  const used = new Set<string>();
  const baseline = next.map((row) => {
    let old = previous.find(
      (p) =>
        !used.has(p.id) && key(p.recognized.name) === key(row.recognized.name),
    );
    if (!old) {
      const first = key(row.recognized.name).split(" ")[0];
      const matches = previous.filter(
        (p) =>
          !used.has(p.id) && key(p.recognized.name).split(" ")[0] === first,
      );
      if (
        matches.length === 1 &&
        next.filter((p) => key(p.recognized.name).split(" ")[0] === first)
          .length === 1
      )
        old = matches[0];
    }
    if (old) used.add(old.id);
    return { ...row, id: old?.id ?? row.id };
  });
  const rows = baseline.flatMap((row) => {
    const old = previous.find((p) => p.id === row.id);
    if (!old) return [row];
    const edited = current.find((p) => p.id === old.id);
    if (!edited) return []; // An explicitly removed item stays removed.
    const merged = { ...row };
    const dirty = new Set(edited.voiceEdited ?? []);
    for (const field of [
      "name",
      "grams",
      "selected",
      "foodId",
      "source",
      "unitConfirmed",
      "nutrition",
      "quantityHint",
    ] as const) {
      if (
        dirty.has(field) ||
        JSON.stringify(edited[field]) !== JSON.stringify(old[field])
      ) {
        dirty.add(field);
        Object.assign(merged, { [field]: edited[field] });
      }
    }
    merged.voiceEdited = [...dirty];
    merged.options = [
      ...new Map(
        [...edited.options, ...row.options].map((food) => [food.id, food]),
      ).values(),
    ];
    return [merged];
  });
  return {
    rows,
    baseline: [
      ...baseline,
      ...previous.filter(
        (old) => !used.has(old.id) && !current.some((row) => row.id === old.id),
      ),
    ].slice(0, 40),
  };
}
