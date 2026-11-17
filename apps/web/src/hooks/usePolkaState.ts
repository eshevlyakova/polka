import { bootstrapPrototype } from "../storage/bootstrap";
import { useState, useRef } from "react";
import { emptyState, type AppState } from "../domain/model";
import { LocalRepository } from "../storage/repository";
import { storageKey } from "../telegram";
import { useStateSession } from "../storage/session";
import { AccountApiError } from "../api/account";
function load(repository: LocalRepository, key: string) {
  try {
    return {
      state: bootstrapPrototype(repository, localStorage, key),
      error: "",
    };
  } catch {
    return {
      state: emptyState(),
      error:
        "Не удалось прочитать сохранение. Старые данные не перезаписаны. Сохранение изменений заблокировано, чтобы защитить старые данные.",
    };
  }
}
export function usePolkaState() {
  const session = useStateSession();
  const [repository] = useState(
    () =>
      new LocalRepository(
        localStorage,
        session?.mode === "demo" ? session.key : storageKey,
      ),
  );
  const [boot] = useState(() =>
    session?.mode === "account"
      ? { state: session.repository.snapshot.state, error: "" }
      : load(repository, session?.mode === "demo" ? session.key : storageKey),
  );
  const [state, setState] = useState(boot.state);
  const [error, setError] = useState(boot.error);
  const [storageBlocked, setStorageBlocked] = useState(!!boot.error);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const pending = useRef<{
    resolve: () => void;
    reject: (error: unknown) => void;
  } | null>(null);
  const lastFailure = useRef<unknown>(null);
  async function attempt(task: () => Promise<{ state: AppState }>) {
    setSaving(true);
    setSaveError("");
    try {
      const snapshot = await task();
      setState(snapshot.state);
      const operation = pending.current;
      pending.current = null;
      lastFailure.current = null;
      operation?.resolve();
    } catch (cause) {
      lastFailure.current = cause;
      if (session?.mode === "account" && session.repository.hasPending) {
        setSaveError(
          cause instanceof Error
            ? cause.message
            : "Не удалось сохранить. Попробуй ещё раз.",
        );
      } else {
        if (cause instanceof AccountApiError && cause.snapshot)
          setState(cause.snapshot.state);
        const operation = pending.current;
        pending.current = null;
        operation?.reject(cause);
      }
    } finally {
      setSaving(false);
    }
  }
  function commit(next: AppState): void | Promise<void> {
    if (storageBlocked)
      throw new Error(
        "Сохранение недоступно: не удалось прочитать прежние данные. Они не перезаписаны",
      );
    if (session?.mode !== "account") {
      repository.save(next);
      setState(next);
      return;
    }
    if (pending.current)
      throw new Error("Дождись завершения предыдущего сохранения.");
    const completion = new Promise<void>((resolve, reject) => {
      pending.current = { resolve, reject };
    });
    void attempt(() => session.repository.save(next));
    return completion;
  }
  function retrySave() {
    if (session?.mode !== "account" || !pending.current || saving) return;
    void attempt(async () => {
      if (
        lastFailure.current instanceof AccountApiError &&
        [401, 403].includes(lastFailure.current.status)
      )
        await session.reauthenticate();
      return session.repository.retry();
    });
  }
  return {
    state,
    setState,
    error,
    setError,
    storageBlocked,
    setStorageBlocked,
    commit,
    session,
    saving,
    saveError,
    retrySave,
  };
}
