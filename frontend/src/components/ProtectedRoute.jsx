import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getToken, telegramLogin } from "../lib/auth.js";
import { isTelegram, initData, ready } from "../lib/telegram.js";
import Spinner from "./Spinner.jsx";

export default function ProtectedRoute({ children }) {
  const [state, setState] = useState(getToken() ? "ok" : "checking");
  useEffect(() => {
    if (getToken()) { setState("ok"); return; }
    if (isTelegram()) { ready();
      telegramLogin(initData()).then(() => setState("ok")).catch(() => setState("no"));
    } else setState("no");
  }, []);
  if (state === "checking") return <Spinner />;
  if (state === "no") return <Navigate to="/login" replace />;
  return children;
}
