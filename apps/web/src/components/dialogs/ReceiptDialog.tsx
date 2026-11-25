import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, LoaderCircle, ScanLine, X } from "lucide-react";
import { useTimedError } from "../../hooks/useTimedError";
import { FeedbackError } from "../FeedbackError";
import { Modal } from "../ui";
import { ReceiptReview } from "../ReceiptReview";
import { fetchReceipt, prepareReceiptImage } from "../../api/receipt";
import {
  importReceipt,
  receiptDrafts,
  type ReceiptDraft,
} from "../../domain/receipt";
import type { AppController } from "../../hooks/useAppController";
export function ReceiptDialog({ app }: { app: AppController }) {
  return app.modal === "receipt" ? <ReceiptFlow app={app} /> : null;
}
function ReceiptFlow({ app }: { app: AppController }) {
  const [image, setImage] = useState("");
  const [rows, setRows] = useState<ReceiptDraft[] | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [ignored, setIgnored] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const { error, setError } = useTimedError();
  const pending = useRef<AbortController | null>(null);
  const disposed = useRef(false);
  const saved = useRef(false);
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      pending.current?.abort();
    };
  }, []);
  async function choose(file?: File) {
    if (!file || preparing || busy) return;
    setPreparing(true);
    setError("");
    try {
      const data = await prepareReceiptImage(file);
      if (!disposed.current && data !== image) {
        setImage(data);
        setRows(null);
      }
    } catch (err) {
      if (!disposed.current)
        setError(
          err instanceof Error ? err.message : "Не удалось открыть фото.",
        );
    } finally {
      if (!disposed.current) setPreparing(false);
    }
  }
  async function recognize() {
    if (pending.current || !image) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      const result = await fetchReceipt(image, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.items.length)
        throw new Error(
          "Продукты не найдены. Выбери более чёткое фото чека или скриншот покупок.",
        );
      setRows(receiptDrafts(result.items, app.catalog));
      setIgnored(result.ignoredCount);
      setReviewing(true);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error ? err.message : "Не удалось распознать чек.",
        );
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        if (!disposed.current) setBusy(false);
      }
    }
  }
  return (
    <Modal
      title={reviewing ? "Проверим продукты" : "Продукты из чека"}
      confirmClose={Boolean(rows?.length)}
      onBack={
        rows && !reviewing
          ? undefined
          : () => {
              if (saved.current) return;
              setError("");
              if (reviewing) setReviewing(false);
              else app.setModal("add-pantry");
            }
      }
      onClose={() => {
        if (!saved.current) app.setModal(null);
      }}
    >
      {reviewing && rows ? (
        <>
          {ignored > 0 && (
            <p className="receipt-intro">
              Пропущено непродуктовых позиций: {ignored}
            </p>
          )}
          <ReceiptReview rows={rows} onChange={setRows} catalog={app.catalog} />
          <button
            className="primary"
            disabled={!rows.some((r) => r.selected)}
            onClick={async () => {
              if (saved.current) return;
              saved.current = true;
              try {
                const next = importReceipt(app.state, rows, app.catalog);
                await app.commit(next);
                app.finishAddingProducts();
              } catch (err) {
                saved.current = false;
                setError(
                  err instanceof Error
                    ? err.message
                    : "Не удалось сохранить продукты. Проверь данные и попробуй снова.",
                  true,
                );
              }
            }}
          >
            Добавить на полку · {rows.filter((r) => r.selected).length}
          </button>
        </>
      ) : (
        <>
          {image && (
            <div className="receipt-preview">
              <img src={image} alt="Выбранное фото чека" />
            </div>
          )}
          <div className="receipt-upload-actions">
            <label className="upload-choice">
              <Camera size={22} />
              <span>Снять чек</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                disabled={busy || preparing}
                onChange={(e) => {
                  void choose(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="upload-choice">
              <ImagePlus size={22} />
              <span>Выбрать фото</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy || preparing}
                onChange={(e) => {
                  void choose(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {preparing && <p role="status">Подготавливаем фото…</p>}

          <button
            className="primary"
            disabled={!image || busy || preparing}
            onClick={() => (rows ? setReviewing(true) : void recognize())}
          >
            {busy ? (
              <LoaderCircle className="ai-spinner" size={19} />
            ) : (
              <ScanLine size={19} />
            )}
            {busy
              ? "Читаем чек…"
              : rows
                ? "Вернуться к списку"
                : "Распознать продукты"}
          </button>
          {busy && (
            <button
              className="primary cancel-action"
              onClick={() => {
                pending.current?.abort();
                pending.current = null;
                setBusy(false);
              }}
            >
              <X size={18} />
              Отменить распознавание
            </button>
          )}
        </>
      )}
      <FeedbackError message={error} onDismiss={() => setError("")} />
    </Modal>
  );
}
