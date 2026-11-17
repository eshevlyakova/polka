import { useEffect, useState } from "react";
export function useTimedError() {
  const [failure, setFailure] = useState({ message: "", persistent: false });
  useEffect(() => {
    if (!failure.message || failure.persistent) return;
    const timer = window.setTimeout(
      () => setFailure({ message: "", persistent: false }),
      12000,
    );
    return () => window.clearTimeout(timer);
  }, [failure]);
  return {
    error: failure.message,
    setError: (message: string, persistent = false) =>
      setFailure({ message, persistent }),
  };
}
