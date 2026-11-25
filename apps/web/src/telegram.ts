type TelegramApp = {
  initData: string;
  initDataUnsafe?: { user?: { id: number; first_name: string } };
  BackButton?: {
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  ready(): void;
  expand(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  isVersionAtLeast?(version: string): boolean;
};
declare global {
  interface Window {
    Telegram?: { WebApp: TelegramApp };
  }
}
export const telegram = window.Telegram?.WebApp;
export function initializeTelegram() {
  if (!telegram?.initData) return;
  telegram?.ready();
  telegram?.expand();
  if (telegram.isVersionAtLeast?.("6.1") !== false) {
    telegram.setHeaderColor?.("#fbf9f2");
    telegram.setBackgroundColor?.("#fbf9f2");
  }
}
// Unverified user id is used only to isolate local storage, never for server authorization.
export const storageKey = `polka:v1:${telegram?.initDataUnsafe?.user?.id ?? "browser"}`;
