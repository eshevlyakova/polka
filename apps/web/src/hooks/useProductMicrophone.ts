import { useEffect, useRef, useState } from "react";

/** Records independent, decodable utterances. A pause sends a turn, never saves food. */
export function useProductMicrophone(
  onAudio: (blob: Blob, finished: boolean) => void,
  onError: (message: string) => void,
) {
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const disposed = useRef(false);
  const starting = useRef(false);
  const finish = useRef(false);
  const skip = useRef(false);
  const callbacks = useRef({ onAudio, onError });
  callbacks.current = { onAudio, onError };

  function release() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    void context.current?.close().catch(() => {});
    context.current = null;
  }
  function stop(finished = true) {
    finish.current = finished;
    if (recorder.current?.state === "recording") recorder.current.stop();
    release();
  }
  useEffect(() => {
    disposed.current = false;
    const visibility = () => {
      if (document.hidden) stop(false);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed.current = true;
      skip.current = true;
      stop(false);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  async function start() {
    if (starting.current || recorder.current?.state === "recording") return;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      callbacks.current.onError(
        "В этом браузере запись недоступна. Открой Полку в обновлённом Telegram.",
      );
      return;
    }
    starting.current = true;
    setRequesting(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (disposed.current || document.hidden) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mime = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const next = new MediaRecorder(media, {
        ...(mime ? { mimeType: mime } : {}),
        audioBitsPerSecond: 48000,
      });
      recorder.current = next;
      const chunks: Blob[] = [];
      let bytes = 0;
      skip.current = false;
      finish.current = false;
      next.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
          bytes += event.data.size;
        }
        if (bytes > 2_800_000 && next.state === "recording") stop(false);
      };
      next.onerror = () => {
        skip.current = true;
        stop(false);
        setRecording(false);
        callbacks.current.onError(
          "Запись прервалась. Включи микрофон ещё раз.",
        );
      };
      next.onstop = () => {
        release();
        if (disposed.current || skip.current) return;
        setRecording(false);
        const blob = new Blob(chunks, {
          type: next.mimeType || mime || "audio/webm",
        });
        if (blob.size < 100) {
          callbacks.current.onError(
            "Запись слишком короткая. Попробуй ещё раз.",
          );
          return;
        }
        callbacks.current.onAudio(blob, finish.current);
      };
      // Silence detection is optional; recording also works without Web Audio.
      let analyser: AnalyserNode | undefined;
      try {
        context.current = new AudioContext();
        analyser = context.current.createAnalyser();
        analyser.fftSize = 1024;
        context.current.createMediaStreamSource(media).connect(analyser);
        void context.current.resume().catch(() => {});
      } catch {
        /* The explicit stop button remains available. */
      }
      const started = Date.now();
      let lastSpeech = started,
        heardSpeech = false;
      const samples = new Uint8Array(1024);
      next.start(1000);
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => {
        const now = Date.now();
        setSeconds(Math.floor((now - started) / 1000));
        if (analyser) {
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(
            samples.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) /
              samples.length,
          );
          if (rms > 0.025) {
            heardSpeech = true;
            lastSpeech = now;
          }
        }
        if ((heardSpeech && now - lastSpeech > 3000) || now - started > 60000)
          stop(false);
      }, 200);
    } catch (error) {
      release();
      if (!disposed.current)
        callbacks.current.onError(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Разреши доступ к микрофону в настройках Telegram или браузера."
            : "Не удалось включить микрофон. Проверь разрешение на запись и попробуй снова.",
        );
    } finally {
      starting.current = false;
      if (!disposed.current) setRequesting(false);
    }
  }
  return { recording, requesting, seconds, start, stop };
}
