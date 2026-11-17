// @vitest-environment jsdom
import React, { StrictMode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AccountGate } from "../apps/web/src/components/AccountGate";
import { useStateSession } from "../apps/web/src/storage/session";
import {
  signIn,
  loadAccountState,
  saveAccountState,
} from "../apps/web/src/api/account";
import { emptyState } from "../shared/model";
import { createDemoState } from "../apps/web/src/data/demo";

vi.mock("../apps/web/src/telegram", () => ({
  telegram: { initData: "signed-test-init-data" },
  storageKey: "polka:v1:browser",
}));
vi.mock("../apps/web/src/api/account", async (original) => ({
  ...(await original<typeof import("../apps/web/src/api/account")>()),
  signIn: vi.fn(),
  loadAccountState: vi.fn(),
  saveAccountState: vi.fn(),
}));
const user = {
  id: "00000000-0000-0000-0000-000000000001",
  telegramId: "100",
  displayName: "Анна",
  username: null,
  onboardingCompletedAt: null,
};
function Probe() {
  const session = useStateSession();
  return (
    <div data-testid="ready">
      {session?.mode === "account"
        ? `${session.user.displayName}: ${session.repository.snapshot.state.pantry.length}`
        : "Демо"}
    </div>
  );
}
beforeEach(() => {
  vi.mocked(signIn).mockResolvedValue(user);
  vi.mocked(loadAccountState).mockResolvedValue({
    state: emptyState(),
    revision: 0,
  });
  vi.mocked(saveAccountState).mockImplementation(async (write) => ({
    state: write.state,
    revision: write.revision + 1,
  }));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

it("opens a verified fresh account without seeding demo data, including React StrictMode", async () => {
  render(
    <StrictMode>
      <AccountGate>
        <Probe />
      </AccountGate>
    </StrictMode>,
  );
  expect((await screen.findByTestId("ready")).textContent).toBe("Анна: 0");
  expect(signIn).toHaveBeenCalledWith("signed-test-init-data");
  expect(loadAccountState).toHaveBeenCalledWith(user.id);
  expect(saveAccountState).not.toHaveBeenCalled();
  expect(localStorage.length).toBe(0);
});
it("requires explicit confirmation to transfer a local save and retains the original copy", async () => {
  const raw = JSON.stringify(createDemoState());
  localStorage.setItem("polka:v1:browser", raw);
  render(
    <AccountGate>
      <Probe />
    </AccountGate>,
  );
  expect(await screen.findByText("Демонстрационные записи")).toBeTruthy();
  expect(saveAccountState).not.toHaveBeenCalled();
  expect(screen.queryByTestId("ready")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Перенести в мой аккаунт" }),
  );
  expect((await screen.findByTestId("ready")).textContent).toBe("Анна: 11");
  expect(saveAccountState).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem("polka:v1:browser")).toBe(raw);
});
it("can decline transfer without deleting old data or uploading it", async () => {
  const raw = JSON.stringify(createDemoState());
  localStorage.setItem("polka:v1:browser", raw);
  render(
    <AccountGate>
      <Probe />
    </AccountGate>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Начать с пустой полкой" }),
  );
  expect((await screen.findByTestId("ready")).textContent).toBe("Анна: 0");
  expect(saveAccountState).not.toHaveBeenCalled();
  expect(localStorage.getItem("polka:v1:browser")).toBe(raw);
});
it("never turns an account/network failure into a successful demo sign-in", async () => {
  vi.mocked(signIn).mockRejectedValue(new Error("Сервер недоступен"));
  render(
    <AccountGate>
      <Probe />
    </AccountGate>,
  );
  expect(await screen.findByText("Сервер недоступен")).toBeTruthy();
  expect(screen.queryByTestId("ready")).toBeNull();
  expect(loadAccountState).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Посмотреть демо" }));
  await waitFor(() =>
    expect(screen.getByTestId("ready").textContent).toBe("Демо"),
  );
});
