import { useEffect, useRef } from "react";
import { fetchQuestionAudio } from "../api/voice";

/** Unlock audio on the initial tap; microphone resumes only after playback ends. */
export function useQuestionSpeaker() {
  const context = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const generation = useRef(0);
  function unlock() {
    if (typeof AudioContext === "undefined") return;
    if (!context.current || context.current.state === "closed")
      context.current = new AudioContext();
    void context.current.resume().catch(() => {});
  }
  function stop() {
    generation.current++;
    source.current?.stop();
    source.current = null;
  }
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      stop();
      void context.current?.close().catch(() => {});
    };
  }, []);
  async function speak(text: string, signal: AbortSignal) {
    const version = generation.current;
    const bytes = await fetchQuestionAudio(text, signal);
    if (signal.aborted || version !== generation.current) return;
    const ctx = context.current;
    if (!ctx || ctx.state !== "running")
      throw new Error("Нажми «Озвучить вопрос», чтобы включить звук.");
    const buffer = await ctx.decodeAudioData(
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
    );
    if (signal.aborted || version !== generation.current) return;
    await new Promise<void>((resolve, reject) => {
      const player = ctx.createBufferSource();
      source.current = player;
      player.buffer = buffer;
      player.connect(ctx.destination);
      const abort = () => {
        player.stop();
      };
      signal.addEventListener("abort", abort, { once: true });
      player.onended = () => {
        signal.removeEventListener("abort", abort);
        if (source.current === player) source.current = null;
        player.disconnect();
        resolve();
      };
      try {
        player.start();
      } catch (error) {
        signal.removeEventListener("abort", abort);
        reject(error);
      }
    });
  }
  return { unlock, speak, stop };
}
