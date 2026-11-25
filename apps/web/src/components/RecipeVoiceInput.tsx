import { useEffect, useRef, useState } from "react";
import { Mic, Square, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useProductMicrophone } from "../hooks/useProductMicrophone";
import { transcribeAudio } from "../api/voice";
import { useTimedError } from "../hooks/useTimedError";
import { FeedbackError } from "./FeedbackError";

export function RecipeVoiceInput({
  disabled,
  onTranscript,
  onBusy,
}: {
  disabled: boolean;
  onTranscript: (text: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState<Blob | null>(null);
  const { error, setError } = useTimedError();
  const pending = useRef<AbortController | null>(null);
  const disposed = useRef(false);
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      pending.current?.abort();
    };
  }, []);
  async function recognize(blob: Blob) {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setRetry(blob);
    setError("");
    try {
      const text = await transcribeAudio(blob, controller.signal);
      if (controller.signal.aborted || disposed.current) return;
      if (!text.trim())
        throw new Error("Не расслышали пожелания. Попробуй ещё раз.");
      onTranscript(text);
      setRetry(null);
    } catch (err) {
      if (!controller.signal.aborted && !disposed.current)
        setError((err as Error).message);
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        if (!disposed.current) setBusy(false);
      }
    }
  }
  const microphone = useProductMicrophone((blob) => {
    void recognize(blob);
  }, setError);
  const active = busy || microphone.recording || microphone.requesting;
  useEffect(() => {
    onBusy(active);
    return () => onBusy(false);
  }, [active, onBusy]);
  return (
    <div className="recipe-voice-input">
      <button
        type="button"
        className={`recipe-microphone ${microphone.recording ? "recording" : ""}`}
        disabled={disabled || busy || microphone.requesting}
        onClick={() => {
          setError("");
          if (microphone.recording) microphone.stop(true);
          else void microphone.start();
        }}
      >
        {busy ? (
          <LoaderCircle className="ai-spinner" size={20} />
        ) : microphone.recording ? (
          <Square size={18} />
        ) : (
          <Mic size={20} />
        )}
        <span>
          {busy
            ? "Переводим речь в текст…"
            : microphone.recording
              ? `Закончить запись · ${microphone.seconds} с`
              : "Продиктовать пожелания"}
        </span>
      </button>
      {busy && (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            pending.current?.abort();
            pending.current = null;
            setBusy(false);
          }}
        >
          <X size={16} />
          Отменить распознавание
        </button>
      )}
      {!busy && retry && (
        <button
          type="button"
          className="text-button"
          disabled={disabled || microphone.recording || microphone.requesting}
          onClick={() => void recognize(retry)}
        >
          <RotateCcw size={16} />
          Повторить отправку записи
        </button>
      )}
      <FeedbackError message={error} onDismiss={() => setError("")} />
    </div>
  );
}
