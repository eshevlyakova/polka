// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { App } from "../apps/web/src/App";
import {
  StateSessionContext,
  type StateSession,
} from "../apps/web/src/storage/session";
import { RemoteRepository } from "../apps/web/src/storage/remote";
import { AccountApiError } from "../apps/web/src/api/account";
import { emptyState } from "../shared/model";
import type { StateSnapshot, StateWrite } from "../shared/account";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
function open(save: (write: StateWrite) => Promise<StateSnapshot>) {
  const state = { ...emptyState(), profile: { name: "Анна" } };
  state.settings.onboarded = true;
  const user = {
    id: "00000000-0000-0000-0000-000000000001",
    telegramId: "100",
    displayName: "Анна",
    username: "anna",
    onboardingCompletedAt: null,
  };
  const repository = new RemoteRepository(
    user.id,
    { state, revision: 0 },
    localStorage,
    save,
  );
  const session: StateSession = {
    mode: "account",
    user,
    repository,
    logout: vi.fn(),
    reauthenticate: vi.fn(),
  };
  render(
    <StateSessionContext.Provider value={session}>
      <App />
    </StateSessionContext.Provider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Профиль", exact: true }));
  fireEvent.click(
    screen.getByRole("button", { name: "Изменить", exact: true }),
  );
  fireEvent.change(screen.getByLabelText("Имя"), {
    target: { value: "Анна новая" },
  });
  return repository;
}
it("keeps the form open and never claims success before the server acknowledges the write", async () => {
  let acknowledge!: (snapshot: StateSnapshot) => void;
  const save = vi.fn(
    (_: StateWrite) =>
      new Promise<StateSnapshot>((resolve) => {
        acknowledge = resolve;
      }),
  );
  const repo = open(save);
  fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(screen.queryByText("Профиль сохранён")).toBeNull();
  expect(document.querySelector(".profile-display-name")?.textContent).toBe(
    "Анна",
  );
  fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () =>
    acknowledge({ state: save.mock.calls[0][0].state, revision: 1 }),
  );
  expect(await screen.findByText("Профиль сохранён")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(repo.snapshot.state.profile?.name).toBe("Анна новая");
  expect(localStorage.getItem("polka:v1:browser")).toBeNull();
});
it("retains a failed write and finishes the original form only after the same request is retried", async () => {
  const save = vi.fn(async (write: StateWrite) => {
    if (save.mock.calls.length === 1)
      throw new AccountApiError("Ответ потерялся", 0);
    return { state: write.state, revision: 1 };
  });
  const repo = open(save);
  fireEvent.click(screen.getByRole("button", { name: "Сохранить профиль" }));
  expect(await screen.findByText("Сохранение не подтверждено")).toBeTruthy();
  expect(localStorage.getItem(repo.pendingKey)).not.toBeNull();
  expect(screen.queryByText("Профиль сохранён")).toBeNull();
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(screen.getByText("Сохранение не подтверждено")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Повторить сохранение" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(save.mock.calls[1][0]).toEqual(save.mock.calls[0][0]);
  expect(screen.getByText("Профиль сохранён")).toBeTruthy();
});
