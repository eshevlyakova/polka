import { useEffect, useRef, useState } from "react";
import { useTimedError } from "./useTimedError";
import { useProductMicrophone } from "./useProductMicrophone";
import { transcribeAudio, fetchVoiceProducts } from "../api/voice";
import { importReceipt, type ReceiptDraft } from "../domain/receipt";
import { useQuestionSpeaker } from "./useQuestionSpeaker";
import { voiceDrafts, mergeVoiceDrafts } from "../domain/voice";
import {
  voiceFinished,
  type VoiceResult,
  type VoiceTurn,
} from "../../../../shared/voice";
import type { AppController } from "./useAppController";

export function useVoicePantryFlow(app: AppController) {
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [rows, setRows] = useState<ReceiptDraft[] | null>(null);
  const speaker = useQuestionSpeaker();
  const baseline = useRef<ReceiptDraft[]>([]);
  const liveRows = useRef(rows);
  liveRows.current = rows;
  const [busy, setBusy] = useState("");
  const [saving, setSaving] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const finishRequested = useRef(false);
  const [retryAudio, setRetryAudio] = useState<{
    blob: Blob;
    finished: boolean;
  } | null>(null);
  const [retryTurns, setRetryTurns] = useState<{
    turns: VoiceTurn[];
    finished: boolean;
  } | null>(null);
  const { error, setError } = useTimedError();
  const pending = useRef<AbortController | null>(null);
  const disposed = useRef(false);
  const saved = useRef(false);
  useEffect(() => {
    disposed.current = false;
    const visibility = () => {
      if (document.hidden) setVoiceActive(false);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed.current = true;
      pending.current?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  async function interpret(
    next: VoiceTurn[],
    finished: boolean,
    controller: AbortController,
  ) {
    setBusy("Секунду…");
    setRetryTurns({ turns: next, finished });
    const edits = baseline.current.flatMap((old) => {
      const row = liveRows.current?.find((r) => r.id === old.id);
      return !row ||
        row.name !== old.name ||
        row.grams !== old.grams ||
        row.voiceEdited?.some((field) => field === "name" || field === "grams")
        ? [
            {
              original: old.recognized.name,
              name: row?.name ?? old.name,
              grams: row?.grams ?? "",
              removed: !row,
            },
          ]
        : [];
    });
    const response = await fetchVoiceProducts(next, controller.signal, edits);
    if (controller.signal.aborted || disposed.current) return;
    setResult(response);
    const merged = mergeVoiceDrafts(
      voiceDrafts(response.items, app.catalog),
      baseline.current,
      liveRows.current ?? [],
    );
    baseline.current = merged.baseline;
    liveRows.current = merged.rows;
    setRows(merged.rows);
    setRetryTurns(null);
    if (response.question)
      setTurns([...next, { role: "assistant", content: response.question }]);
    else setTurns(next);
    const reply =
      response.question ||
      (merged.rows.length ? "Что ещё добавим?" : "Какие продукты у тебя есть?");
    if (voiceActive && !finished && !finishRequested.current) {
      setBusy("Полка уточняет…");
      try {
        await speaker.speak(reply, controller.signal);
      } catch (err) {
        if (!controller.signal.aborted && !disposed.current) {
          setVoiceActive(false);
          setError((err as Error).message);
        }
      }
    }
    if (finished || finishRequested.current) {
      setVoiceActive(false);
      finishRequested.current = true;
    }
  }
  async function sendAudio(blob: Blob, finished: boolean) {
    if (pending.current) return;
    if (finished) setVoiceActive(false);
    if (turns.length >= 23) {
      setVoiceActive(false);
      setError("Подтверди этот список, затем можно начать следующий.");
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setRetryAudio({ blob, finished });
    setBusy("Секунду…");
    setError("");
    try {
      const transcript = await transcribeAudio(blob, controller.signal);
      if (controller.signal.aborted || disposed.current) return;
      setRetryAudio(null);
      if (!transcript.trim())
        throw new Error(
          "Не расслышали продукты. Попробуй говорить ближе к микрофону.",
        );
      if (voiceFinished(transcript)) {
        setVoiceActive(false);
        finishRequested.current = true;
        return;
      }
      const next: VoiceTurn[] = [
        ...turns,
        { role: "user", content: transcript },
      ];
      setTurns(next);
      await interpret(next, finished, controller);
    } catch (err) {
      setVoiceActive(false);
      if (!controller.signal.aborted && !disposed.current)
        setError((err as Error).message);
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        if (!disposed.current) setBusy("");
      }
    }
  }
  const microphone = useProductMicrophone(
    (blob, finished) => {
      void sendAudio(blob, finished);
    },
    (message) => {
      setVoiceActive(false);
      setError(message);
    },
    voiceActive,
  );
  useEffect(() => {
    if (
      voiceActive &&
      !busy &&
      !retryAudio &&
      !retryTurns &&
      !microphone.recording &&
      !microphone.requesting
    )
      void microphone.start();
  }, [
    voiceActive,
    busy,
    rows,
    retryAudio,
    retryTurns,
    microphone.recording,
    microphone.requesting,
  ]);
  function startVoice() {
    speaker.unlock();
    finishRequested.current = false;
    setVoiceActive(true);
    void microphone.start();
  }
  function finishVoice() {
    finishRequested.current = true;
    speaker.stop();
    setVoiceActive(false);
    if (microphone.recording) microphone.stop(true);
  }
  const firstFill = !app.state.pantry.some((item) => item.grams > 0);

  function cancel() {
    speaker.stop();
    setVoiceActive(false);
    pending.current?.abort();
    pending.current = null;
    setBusy("");
  }
  function skipFailedPhrase() {
    if (pending.current) return;
    if (retryTurns) setTurns(retryTurns.turns.slice(0, -1));
    setRetryAudio(null);
    setRetryTurns(null);
    setError("");
  }
  async function save() {
    if (
      !rows ||
      saved.current ||
      pending.current ||
      microphone.recording ||
      microphone.requesting
    )
      return;
    saved.current = true;
    setSaving(true);
    setError("");
    try {
      await app.commit(importReceipt(app.state, rows, app.catalog));
      app.finishAddingProducts();
    } catch (err) {
      saved.current = false;
      setError((err as Error).message, true);
    } finally {
      if (!disposed.current) setSaving(false);
    }
  }
  async function replayQuestion() {
    if (!result?.question || pending.current) return;
    speaker.unlock();
    const controller = new AbortController();
    pending.current = controller;
    setVoiceActive(false);
    setBusy("Полка уточняет…");
    try {
      await speaker.speak(result.question, controller.signal);
      if (!controller.signal.aborted && !disposed.current && !document.hidden) {
        finishRequested.current = false;
        setVoiceActive(true);
      }
    } catch (err) {
      if (!controller.signal.aborted) setError((err as Error).message);
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        if (!disposed.current) setBusy("");
      }
    }
  }
  async function retryInterpret() {
    if (!retryTurns || pending.current) return;

    const controller = new AbortController();
    pending.current = controller;
    setError("");
    try {
      await interpret(retryTurns.turns, retryTurns.finished, controller);
    } catch (err) {
      if (!controller.signal.aborted && !disposed.current)
        setError((err as Error).message);
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        if (!disposed.current) setBusy("");
      }
    }
  }
  return {
    skipFailedPhrase,
    replayQuestion,
    turns,
    result,
    rows,
    setRows,
    busy,
    saving,
    retryAudio,
    retryTurns,
    error,
    setError,
    microphone,
    firstFill,
    sendAudio,
    save,
    retryInterpret,
    cancel,
    voiceActive,
    startVoice,
    finishVoice,
  };
}
