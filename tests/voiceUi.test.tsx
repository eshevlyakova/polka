// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from "@testing-library/react";
import { App } from "../apps/web/src/App";
import { emptyState } from "../shared/model";
import { basicFoods } from "../shared/basicFoods";
import { fetchVoiceProducts, transcribeAudio } from "../apps/web/src/api/voice";
const harness = vi.hoisted(() => ({
  onAudio: null as null | ((blob: Blob, finished: boolean) => void),
  speak: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("../apps/web/src/api/voice", () => ({
  fetchVoiceProducts: vi.fn(),
  transcribeAudio: vi.fn(),
}));
vi.mock("../apps/web/src/hooks/useQuestionSpeaker", () => ({
  useQuestionSpeaker: () => ({
    unlock: vi.fn(),
    speak: harness.speak,
    stop: harness.stop,
  }),
}));
vi.mock("../apps/web/src/hooks/useProductMicrophone", async () => {
  const { useState } = await import("react");
  return {
    useProductMicrophone: (callback: (b: Blob, f: boolean) => void) => {
      const [recording, setRecording] = useState(false);
      harness.onAudio = (blob, finished) => {
        setRecording(false);
        callback(blob, finished);
      };
      return {
        recording,
        requesting: false,
        seconds: 0,
        start: () => {
          harness.start();
          setRecording(true);
        },
        stop: () => {
          setRecording(false);
        },
      };
    },
  };
});
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const state = emptyState();
  state.settings.onboarded = true;
  localStorage.setItem("polka:v1:browser", JSON.stringify(state));
  localStorage.setItem("polka:v1:browser:demo-ready-v3", "1");
  harness.start.mockClear();
  harness.speak.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(fetchVoiceProducts).mockReset();
  vi.mocked(transcribeAudio).mockReset();
  localStorage.clear();
});
const result = {
  items: [
    {
      id: "cottage",
      name: "Творог 5%",
      quantity: 2,
      unit: "pcs" as const,
      packageSize: 200,
      packageUnit: "g" as const,
      grams: 400,
      candidates: [
        {
          food: basicFoods.find((f) => f.id === "cottage")!,
          kind: "generic" as const,
        },
      ],
    },
  ],
  question: "",
};
function open() {
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Добавить продукты", exact: true }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Голосом/ }));
}
async function say(text: string) {
  vi.mocked(transcribeAudio).mockResolvedValueOnce(text);
  await act(async () => harness.onAudio!(new Blob(["audio"]), false));
}
it("speaks clarifications before resuming the microphone and keeps an editable list on the same screen", async () => {
  let finishSpeech!: () => void;
  harness.speak.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishSpeech = resolve;
      }),
  );
  vi.mocked(fetchVoiceProducts)
    .mockResolvedValueOnce({
      ...result,
      items: [{ ...result.items[0], grams: null }],
      question: "Сколько граммов в пачке?",
    })
    .mockResolvedValueOnce(result);
  open();
  expect(screen.queryByLabelText("Написать продукты или ответ")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Начать диктовку" }));
  await say("Две пачки творога");
  expect(screen.queryByLabelText("Название продукта 1")).toBeNull();
  expect(harness.speak).toHaveBeenCalledWith(
    "Сколько граммов в пачке?",
    expect.any(AbortSignal),
  );
  expect(harness.start).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: "Проверить список" })).toBeNull();
  await act(async () => finishSpeech());
  await waitFor(() => expect(harness.start).toHaveBeenCalledTimes(2));
  await say("По 200 граммов");
  await waitFor(() =>
    expect((screen.getByLabelText("Масса, г") as HTMLInputElement).value).toBe(
      "400",
    ),
  );
  fireEvent.change(screen.getByLabelText("Название продукта 1"), {
    target: { value: "Мой творог" },
  });
  fireEvent.change(screen.getByLabelText("Масса, г"), {
    target: { value: "350" },
  });
  await say("Всё");
  expect(vi.mocked(fetchVoiceProducts)).toHaveBeenCalledTimes(2);
  expect(JSON.parse(localStorage.getItem("polka:v1:browser")!).pantry).toEqual(
    [],
  );
  fireEvent.click(screen.getByRole("button", { name: /Добавить на полку/ }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const saved = JSON.parse(localStorage.getItem("polka:v1:browser")!);
  expect(saved.pantry).toHaveLength(1);
  expect(saved.pantry[0].grams).toBe(350);
  expect(saved.pantry[0].label).toBe("Мой творог");
});
it("preserves edits across subsequent AI responses and retains the list after a save failure", async () => {
  vi.mocked(fetchVoiceProducts).mockResolvedValue(result);
  open();
  fireEvent.click(screen.getByRole("button", { name: "Начать диктовку" }));
  await say("Творог 400 граммов");
  await screen.findByLabelText("Масса, г");
  fireEvent.change(screen.getByLabelText("Масса, г"), {
    target: { value: "300" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Продолжить диктовку" }));
  await say("И больше ничего");
  expect((screen.getByLabelText("Масса, г") as HTMLInputElement).value).toBe(
    "300",
  );
  expect(vi.mocked(fetchVoiceProducts).mock.calls[1][2]).toEqual([
    { original: "Творог 5%", name: "Творог 5%", grams: "300", removed: false },
  ]);
  await say("Всё");
  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new Error("storage full");
  });
  fireEvent.click(screen.getByRole("button", { name: /Добавить на полку/ }));
  await screen.findByRole("alert");
  expect((screen.getByLabelText("Масса, г") as HTMLInputElement).value).toBe(
    "300",
  );
  fireEvent.click(screen.getByRole("button", { name: /Добавить на полку/ }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).pantry,
  ).toHaveLength(1);
});
it("keeps the last failed phrase retryable and blocks saving an incomplete interpretation", async () => {
  vi.mocked(fetchVoiceProducts)
    .mockResolvedValueOnce(result)
    .mockRejectedValueOnce(new Error("Нет связи"));
  open();
  fireEvent.click(screen.getByRole("button", { name: "Начать диктовку" }));
  await say("Творог 400 граммов");
  await screen.findByLabelText("Масса, г");
  await say("И ещё помидоры");
  await screen.findByRole("button", { name: "Повторить разбор списка" });
  expect(
    (
      screen.getByRole("button", {
        name: /Добавить на полку/,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(screen.queryByText("И ещё помидоры")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Пропустить последнюю фразу" }),
  );
  expect(screen.queryByText("И ещё помидоры")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Добавить на полку/ }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(
    JSON.parse(localStorage.getItem("polka:v1:browser")!).pantry,
  ).toHaveLength(1);
});
it("does not restart listening silently when voice playback fails", async () => {
  harness.speak.mockRejectedValueOnce(new Error("Не удалось озвучить вопрос"));
  vi.mocked(fetchVoiceProducts).mockResolvedValue({
    ...result,
    question: "Какой бренд?",
  });
  open();
  fireEvent.click(screen.getByRole("button", { name: "Начать диктовку" }));
  await say("Творог 400 граммов");
  await screen.findByRole("alert");
  expect(harness.start).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Озвучить вопрос" })).toBeTruthy();
  expect(screen.getByLabelText("Название продукта 1")).toBeTruthy();
});
