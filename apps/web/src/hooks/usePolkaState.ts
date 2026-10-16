import { bootstrapPrototype } from "../storage/bootstrap";
import { createDemoState } from "../data/demo";
import { useState } from "react";
import { emptyState, type AppState } from "../domain/model";
import { LocalRepository } from "../storage/repository";
import { storageKey } from "../telegram";
export const repository = new LocalRepository(localStorage, storageKey);
function load() {
  try {
    return {
      state: bootstrapPrototype(repository, localStorage, storageKey),
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
  const [boot] = useState(load);
  const [state, setState] = useState(boot.state);
  const [error, setError] = useState(boot.error);
  const [storageBlocked, setStorageBlocked] = useState(!!boot.error);
  function commit(next: AppState) {
    if (storageBlocked)
      throw new Error(
        "Сохранение недоступно: не удалось прочитать прежние данные. Они не перезаписаны",
      );
    repository.save(next);
    setState(next);
  }
  return {
    state,
    setState,
    error,
    setError,
    storageBlocked,
    setStorageBlocked,
    commit,
  };
}
