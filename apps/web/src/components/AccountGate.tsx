import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  signIn,
  signOut,
  loadAccountState,
  AccountApiError,
} from "../api/account";
import { RemoteRepository } from "../storage/remote";
import { legacySaves, type LegacySave } from "../storage/legacy";
import { StateSessionContext, type StateSession } from "../storage/session";
import { storageKey, telegram } from "../telegram";
import { Logo } from "./ui";
import type { Account } from "../../../../shared/account";

type AccountSession = Extract<StateSession, { mode: "account" }>;
type Gate =
  | { phase: "loading" }
  | { phase: "entry"; error: string }
  | { phase: "ready"; session: StateSession }
  | {
      phase: "import";
      session: AccountSession;
      saves: LegacySave[];
      unreadable: boolean;
    }
  | { phase: "recover"; session: AccountSession };

export function AccountGate({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<Gate>({ phase: "loading" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);

  async function enter() {
    const attempt = ++generation.current;
    setGate({ phase: "loading" });
    setError("");
    try {
      const user = await signIn(telegram?.initData || undefined);
      if (attempt !== generation.current) return;
      const snapshot = await loadAccountState(user.id);
      if (attempt !== generation.current) return;
      const repository = new RemoteRepository(user.id, snapshot, localStorage);
      const session = makeSession(user, repository);
      if (repository.restorePending()) {
        setGate({ phase: "recover", session });
        return;
      }
      const legacy =
        snapshot.revision === 0
          ? legacySaves(localStorage, user)
          : { saves: [], unreadable: false };
      if (legacy.saves.length || legacy.unreadable)
        setGate({ phase: "import", session, ...legacy });
      else setGate({ phase: "ready", session });
    } catch (cause) {
      if (attempt === generation.current)
        setGate({
          phase: "entry",
          error:
            cause instanceof Error
              ? cause.message
              : "Не удалось открыть аккаунт.",
        });
    }
  }
  function makeSession(
    user: Account,
    repository: RemoteRepository,
  ): AccountSession {
    return {
      mode: "account",
      user,
      repository,
      logout: async () => {
        await signOut();
        ++generation.current;
        setGate({ phase: "entry", error: "" });
      },
      reauthenticate: async () => {
        const current = await signIn(telegram?.initData || undefined);
        if (current.id !== user.id)
          throw new Error(
            "Аккаунт изменился. Перезапусти приложение; черновик останется у прежнего аккаунта.",
          );
      },
    };
  }
  function demo(key = "polka:demo:v1") {
    ++generation.current;
    setGate({
      phase: "ready",
      session: {
        mode: "demo",
        key,
        exit: () => setGate({ phase: "entry", error: "" }),
      },
    });
  }
  useEffect(() => {
    if (import.meta.env.DEV && !telegram?.initData) demo(storageKey);
    else void enter();
    return () => {
      ++generation.current;
    };
  }, []);

  if (gate.phase === "ready")
    return (
      <StateSessionContext.Provider value={gate.session}>
        <div
          key={
            gate.session.mode === "account"
              ? gate.session.user.id
              : gate.session.key
          }
        >
          {children}
        </div>
      </StateSessionContext.Provider>
    );

  return (
    <main className="account-gate">
      <Logo />
      <section className="account-card">
        {gate.phase === "loading" ? (
          <>
            <h1>Открываем твою Полку</h1>
            <p role="status">Проверяем вход и загружаем записи…</p>
          </>
        ) : gate.phase === "entry" ? (
          <>
            <h1>Твоя Полка — в Telegram</h1>
            <p>
              Войди через бота, чтобы продукты и дневник были с тобой на разных
              устройствах.
            </p>
            {gate.error && (
              <p className="notice error" role="alert">
                {gate.error}
              </p>
            )}
            <a className="primary" href="https://t.me/polka_food_bot">
              Открыть @polka_food_bot
            </a>
            <button className="secondary" onClick={() => void enter()}>
              Войти снова
            </button>
            <button className="text-button" onClick={() => demo()}>
              Посмотреть демо
            </button>
          </>
        ) : gate.phase === "import" ? (
          <>
            <h1>{gate.session.user.displayName}, перенесём записи?</h1>
            <p>
              На этом устройстве есть старое сохранение. Выбери его, только если
              это твои записи. Они попадут в твой Telegram-аккаунт.
            </p>
            {gate.saves.map((save) => (
              <article className="legacy-save" key={save.key}>
                <strong>
                  {save.demo
                    ? "Демонстрационные записи"
                    : save.key.endsWith(":browser")
                      ? "Записи из браузера"
                      : "Прежние записи Telegram"}
                </strong>
                {save.state.profile?.name && <p>{save.state.profile.name}</p>}
                <p>
                  Продуктов: {save.state.pantry.length} · Записей в дневнике:{" "}
                  {save.state.diary.length} · Готовых блюд:{" "}
                  {save.state.batches.length}
                </p>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await gate.session.repository.save(save.state);
                      setGate({ phase: "ready", session: gate.session });
                    } catch (cause) {
                      setError((cause as Error).message);
                      if (
                        gate.session.repository.hasPending ||
                        (cause instanceof AccountApiError &&
                          cause.status === 409)
                      )
                        setGate({ phase: "recover", session: gate.session });
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Перенести в мой аккаунт
                </button>
              </article>
            ))}
            {gate.unreadable && (
              <p className="notice error">
                Одно из старых сохранений не удалось прочитать. Оно не удалено и
                не перезаписано.
              </p>
            )}
            <button
              className="primary"
              disabled={busy}
              onClick={() => setGate({ phase: "ready", session: gate.session })}
            >
              Начать с пустой полкой
            </button>
            <p className="muted">
              Старая локальная копия останется на устройстве.
            </p>
          </>
        ) : (
          <>
            <h1>Проверим последнее сохранение</h1>
            <p>
              Остались неподтверждённые изменения этого аккаунта. Проверим,
              получил ли их сервер, без повторного списания продуктов.
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await gate.session.repository.retry();
                  setGate({ phase: "ready", session: gate.session });
                } catch (cause) {
                  setError((cause as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Проверить сохранение
            </button>
            {!gate.session.repository.hasPending && (
              <button
                className="secondary"
                onClick={() =>
                  setGate({ phase: "ready", session: gate.session })
                }
              >
                Открыть актуальные данные
              </button>
            )}
            <a className="text-button" href="https://t.me/polka_food_bot">
              Вернуться в Telegram
            </a>
          </>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
