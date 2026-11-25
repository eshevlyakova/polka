// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { OnboardingDialog } from "../apps/web/src/components/dialogs/OnboardingDialog";
import { emptyState } from "../shared/model";
import type { AppController } from "../apps/web/src/hooks/useAppController";
afterEach(cleanup);
it("prefills an editable Telegram name, requires it, and lets the user skip body measurements", async () => {
  const commit = vi.fn().mockResolvedValue(undefined);
  const app = {
    state: emptyState(),
    session: { mode: "account", user: { displayName: "Евгения" } },
    commit,
    run: vi.fn(),
    saving: false,
  } as unknown as AppController;
  render(<OnboardingDialog app={app} />);
  const name = screen.getByLabelText("Имя") as HTMLInputElement;
  expect(name.value).toBe("Евгения");
  expect(name.required).toBe(true);
  expect((screen.getByLabelText("Рост, см") as HTMLInputElement).required).toBe(
    false,
  );
  fireEvent.change(name, { target: { value: "  " } });
  fireEvent.submit(name.closest("form")!);
  await screen.findByRole("alert");
  expect(commit).not.toHaveBeenCalled();
  fireEvent.change(name, { target: { value: "Женя" } });
  fireEvent.submit(name.closest("form")!);
  await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
  expect(commit.mock.calls[0][0].profile).toMatchObject({ name: "Женя" });
  expect(commit.mock.calls[0][0].profile.weightKg).toBeUndefined();
  expect(
    await screen.findByRole("button", { name: /Назвать продукты голосом/ }),
  ).toBeTruthy();
});
it("keeps the first-entry form open when saving fails", async () => {
  const app = {
    state: emptyState(),
    session: { mode: "account", user: { displayName: "Женя" } },
    commit: vi.fn().mockRejectedValue(new Error("Нет связи")),
    saving: false,
  } as unknown as AppController;
  render(<OnboardingDialog app={app} />);
  fireEvent.submit(screen.getByLabelText("Имя").closest("form")!);
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Нет связи",
  );
  expect(
    screen.queryByRole("button", { name: /Назвать продукты голосом/ }),
  ).toBeNull();
});

it.each([0, 1])(
  "distinguishes the Telegram name supplied by the server from a saved profile at revision %i",
  (revision) => {
    const state = { ...emptyState(), profile: { name: "Женя" } };
    state.settings.profileConfirmed = revision > 0;
    const app = {
      state,
      session: {
        mode: "account",
        user: { displayName: "Женя" },
        repository: { snapshot: { revision: 7, state } },
      },
    } as unknown as AppController;
    render(<OnboardingDialog app={app} />);
    expect(Boolean(screen.queryByLabelText("Имя"))).toBe(revision === 0);
    expect(
      Boolean(
        screen.queryByRole("button", { name: /Назвать продукты голосом/ }),
      ),
    ).toBe(revision > 0);
  },
);
