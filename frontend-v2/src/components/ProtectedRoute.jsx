import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getToken, telegramLogin } from "../lib/auth";
import { isTelegram, initData, ready } from "../lib/telegram";
import { FullScreenLoader } from "./ui/Spinner";
import { t } from "../lib/i18n";

/**
 * Guards a subtree:
 *  - token present            → render children
 *  - no token but in Telegram → auto telegramLogin(initData()), then render
 *  - otherwise                → redirect to /login
 */
export default function ProtectedRoute({ children }) {
  const [state, setState] = useState(getToken() ? "ok" : "checking");

  useEffect(() => {
    if (getToken()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("ok");
      return;
    }
    if (isTelegram()) {
      ready();
      telegramLogin(initData())
        .then(() => setState("ok"))
        .catch(() => setState("no"));
    } else {
      setState("no");
    }
  }, []);

  if (state === "checking") return <FullScreenLoader label={t("loading")} />;
  if (state === "no") return <Navigate to="/login" replace />;
  return children;
}
