// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useProductMicrophone } from "../apps/web/src/hooks/useProductMicrophone";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
class Recorder {
  static isTypeSupported(type: string) {
    return type.startsWith("audio/mp4");
  }
  state = "inactive";
  mimeType = "audio/mp4";
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  onerror?: () => void;
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["x".repeat(200)], { type: this.mimeType }),
    });
    this.onstop?.();
  }
}
it("supports MP4 recording, sends a finished utterance and releases microphone tracks", async () => {
  const stopped = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi
        .fn()
        .mockResolvedValue({ getTracks: () => [{ stop: stopped }] }),
    },
  });
  vi.stubGlobal("MediaRecorder", Recorder);
  const onAudio = vi.fn();
  const { result } = renderHook(() => useProductMicrophone(onAudio, vi.fn()));
  await act(async () => {
    await result.current.start();
  });
  expect(result.current.recording).toBe(true);
  act(() => result.current.stop(true));
  expect(result.current.recording).toBe(false);
  expect(onAudio.mock.calls[0][0].type).toBe("audio/mp4");
  expect(onAudio.mock.calls[0][1]).toBe(true);
  expect(stopped).toHaveBeenCalledTimes(1);
});
it("stops after the safety limit without ending the list and never submits on unmount", async () => {
  vi.useFakeTimers();
  const stopped = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi
        .fn()
        .mockResolvedValue({ getTracks: () => [{ stop: stopped }] }),
    },
  });
  vi.stubGlobal("MediaRecorder", Recorder);
  const onAudio = vi.fn();
  const { result, unmount } = renderHook(() =>
    useProductMicrophone(onAudio, vi.fn()),
  );
  await act(async () => {
    await result.current.start();
  });
  act(() => vi.advanceTimersByTime(60500));
  expect(onAudio.mock.calls[0][1]).toBe(false);
  await act(async () => {
    await result.current.start();
  });
  unmount();
  expect(onAudio).toHaveBeenCalledTimes(1);
  expect(stopped).toHaveBeenCalledTimes(2);
});
it("releases a permission result received after the dialog has closed", async () => {
  const stopped = vi.fn();
  let grant!: (value: unknown) => void;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: () =>
        new Promise((resolve) => {
          grant = resolve;
        }),
    },
  });
  vi.stubGlobal("MediaRecorder", Recorder);
  const onAudio = vi.fn();
  const { result, unmount } = renderHook(() =>
    useProductMicrophone(onAudio, vi.fn()),
  );
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.start();
  });
  unmount();
  await act(async () => {
    grant({ getTracks: () => [{ stop: stopped }] });
    await pending;
  });
  expect(stopped).toHaveBeenCalledTimes(1);
  expect(onAudio).not.toHaveBeenCalled();
});
