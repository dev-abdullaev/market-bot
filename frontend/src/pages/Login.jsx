import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Lock, Phone, Store } from "lucide-react";
import { login } from "../lib/auth";
import { t } from "../lib/i18n";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { ErrorAlert } from "../components/ui/Alert";
import { Spinner } from "../components/ui/Spinner";

export default function Login() {
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(username, password);
      nav("/panel");
    } catch {
      setErr(t("login_failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted px-4 py-10">
      {/* Decorative ambient blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl animate-blob-1" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-secondary/15 blur-3xl animate-blob-2" />

      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="relative w-full max-w-sm"
      >
        <Card className="p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lift">
              <Store className="h-7 w-7" strokeWidth={2.1} />
            </span>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              market<span className="text-primary">bot</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("panel")}</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <ErrorAlert message={err} />

            <div>
              <Label htmlFor="login-phone">{t("phone")}</Label>
              <Input
                id="login-phone"
                icon={Phone}
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="login-password">{t("password")}</Label>
              <Input
                id="login-password"
                icon={Lock}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={busy}
              className="w-full"
            >
              {busy ? <Spinner className="text-primary-foreground" /> : null}
              {t("login")}
              {!busy ? <ArrowRight className="h-4 w-4" strokeWidth={2.2} /> : null}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
