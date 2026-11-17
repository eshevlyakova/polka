import { X } from "lucide-react";
export function FeedbackError({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return message ? (
    <div className="notice error feedback-error" role="alert">
      <span>{message}</span>
      <button type="button" aria-label="Скрыть ошибку" onClick={onDismiss}>
        <X size={17} />
      </button>
    </div>
  ) : null;
}
