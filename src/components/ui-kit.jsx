/* eslint-disable */
import React, { createContext, useContext } from "react";

/**
 * SUPER SIMPLE: Toasts are disabled visually.
 * We keep the context API so the rest of the app doesn't break,
 * but we don't render anything on the screen.
 */

const ToastCtx = createContext({ pushToast: () => {} });

export function ToastProvider({ children }) {
  function pushToast(message, type = "info", ms = 1800) {
    // Just log to console so you can still see them if needed
    console.log("[toast suppressed]", { type, message, ms });
    // ❌ No UI rendered on purpose
  }

  return (
    <ToastCtx.Provider value={{ pushToast }}>
      {children}
      {/* No toast UI at all */}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
