import {
  Mic,
  Square,
  LoaderCircle,
  Check,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { Modal } from "../ui";
import { ReceiptReview } from "../ReceiptReview";
import { FeedbackError } from "../FeedbackError";
import { useVoicePantryFlow } from "../../hooks/useVoicePantryFlow";
import type { AppController } from "../../hooks/useAppController";

export function VoicePantryDialog({ app }: { app: AppController }) {
  return app.modal === "voice" ? <VoicePantryFlow app={app} /> : null;
}
function VoicePantryFlow({ app }: { app: AppController }) {
  const flow = useVoicePantryFlow(app);
  const { result, rows, busy, saving, microphone, voiceActive, error } = flow;
  const active = voiceActive || microphone.recording || microphone.requesting;
  return (
    <Modal
      title={flow.firstFill ? "Разберём твой холодильник" : "Разберём покупки"}
      confirmClose={Boolean(rows?.length)}
      onClosingDraft={flow.finishVoice}
      onBack={
        !rows?.length && !active && !busy
          ? () => app.setModal("add-pantry")
          : undefined
      }
      onClose={() => {
        if (!saving) app.setModal(null);
      }}
    >
      <div
        className={`voice-flow voice-live ${rows?.length ? "has-products" : ""}`}
      >
        <div
          className={`voice-stage ${microphone.recording ? "is-recording" : ""}`}
        >
          <div className="voice-orbit" aria-hidden="true">
            <Mic size={28} />
            <span />
            <span />
          </div>
          <div className="voice-stage-copy">
            <h3>
              {busy ||
                (microphone.recording
                  ? "Слушаю тебя"
                  : result?.question
                    ? "Уточним одну деталь"
                    : rows?.length
                      ? "Что ещё добавим?"
                      : "Расскажи, что есть дома")}
            </h3>
            <p aria-live="polite">
              {result?.question ||
                (rows?.length
                  ? "Список можно править прямо здесь."
                  : "Называй продукты и количество. Если чего-то не хватит, Полка спросит голосом.")}
            </p>
          </div>
        </div>
        {!!flow.turns.length && (
          <p className="voice-last-phrase">
            {flow.turns.filter((t) => t.role === "user").at(-1)?.content}
          </p>
        )}
        <div className="voice-live-controls">
          <button
            className="primary voice-record"
            disabled={
              saving ||
              microphone.requesting ||
              (!!busy && !active) ||
              (!active && (!!flow.retryAudio || !!flow.retryTurns))
            }
            onClick={() => {
              flow.setError("");
              if (active) flow.finishVoice();
              else flow.startVoice();
            }}
          >
            {busy ? (
              <LoaderCircle size={19} className="ai-spinner" />
            ) : active ? (
              <Square size={18} />
            ) : (
              <Mic size={20} />
            )}
            {active
              ? "Завершить диктовку"
              : microphone.requesting
                ? "Подключаем микрофон…"
                : flow.turns.length
                  ? "Продолжить диктовку"
                  : "Начать диктовку"}
          </button>
          {!!result?.question &&
            !busy &&
            !active &&
            !flow.retryAudio &&
            !flow.retryTurns && (
              <button
                className="icon-button"
                aria-label="Озвучить вопрос"
                onClick={() => void flow.replayQuestion()}
              >
                <Volume2 size={21} />
              </button>
            )}
        </div>
        {!!rows?.length && (
          <section
            className="voice-editable-list"
            aria-label="Продукты для добавления"
          >
            <div className="voice-list-heading">
              <h3>На твою полку</h3>
              <span>{rows.length}</span>
            </div>
            <ReceiptReview
              rows={rows}
              onChange={flow.setRows}
              catalog={app.catalog}
              originLabel="Ты продиктовал"
              editableNames
            />
          </section>
        )}
        {busy && (
          <button className="text-button" onClick={flow.cancel}>
            Отменить запрос
          </button>
        )}
        {flow.retryAudio && !busy && (
          <button
            className="primary cancel-action"
            onClick={() =>
              void flow.sendAudio(
                flow.retryAudio!.blob,
                flow.retryAudio!.finished,
              )
            }
          >
            <RotateCcw size={18} />
            Повторить отправку записи
          </button>
        )}
        {flow.retryTurns && !busy && (
          <button
            className="primary cancel-action"
            onClick={() => void flow.retryInterpret()}
          >
            <RotateCcw size={18} />
            Повторить разбор списка
          </button>
        )}
        {!busy && (flow.retryAudio || flow.retryTurns) && (
          <button
            type="button"
            className="text-button"
            onClick={flow.skipFailedPhrase}
          >
            Пропустить последнюю фразу
          </button>
        )}
        {error && !rows?.length && !busy && !active && (
          <button
            type="button"
            className="secondary"
            onClick={() => app.setModal("pantry")}
          >
            Ввести продукты вручную
          </button>
        )}
        {!!rows?.length && (
          <button
            className="primary voice-confirm"
            disabled={
              saving ||
              !!busy ||
              active ||
              !!flow.retryAudio ||
              !!flow.retryTurns ||
              !rows.some((row) => row.selected)
            }
            onClick={() => void flow.save()}
          >
            <Check size={19} />
            {saving
              ? "Сохраняем…"
              : `Добавить на полку · ${rows.filter((row) => row.selected).length}`}
          </button>
        )}
        <FeedbackError message={error} onDismiss={() => flow.setError("")} />
      </div>
    </Modal>
  );
}
