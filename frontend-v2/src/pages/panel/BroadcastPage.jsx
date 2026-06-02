import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Megaphone, Send } from "lucide-react";
import api from "../../lib/api";
import { t, tf } from "../../lib/i18n";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Label } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { ErrorAlert } from "../../components/ui/Alert";
import { PageHeader, Toast } from "../../components/panel/common";

export default function BroadcastPage() {
  const reduce = useReducedMotion();
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");

  // Auto-dismiss the success toast.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const send = async () => {
    setBusy(true);
    setErr("");
    setConfirming(false);
    try {
      const { data } = await api.post("/admin/broadcast", { text: text.trim() });
      setToast(tf("broadcast_sent", { n: data?.sent ?? 0 }));
      setText("");
    } catch (e) {
      setErr(e?.response?.data?.detail || t("error"));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setConfirming(true);
  };

  return (
    <div>
      <PageHeader
        icon={Megaphone}
        title={t("nav_broadcast")}
        subtitle={t("broadcast_hint")}
      />

      <Card className="max-w-2xl p-4 sm:p-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <ErrorAlert message={err} />
          <div>
            <Label htmlFor="bc-text">{t("message_text")}</Label>
            <textarea
              id="bc-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              disabled={busy}
              placeholder={t("message_text")}
              className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground shadow-soft transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:opacity-50"
            />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {confirming ? (
              <motion.div
                key="confirm"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm font-bold text-foreground">
                  {t("confirm_send")}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming(false)}
                  >
                    {t("back")}
                  </Button>
                  <Button type="button" size="sm" onClick={send}>
                    <Send className="h-4 w-4" strokeWidth={2.3} />
                    {t("send")}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="submit"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.18 }}
              >
                <Button
                  type="submit"
                  size="lg"
                  disabled={!text.trim() || busy}
                  className="w-full sm:w-auto"
                >
                  {busy ? (
                    <Spinner className="text-primary-foreground" size={18} />
                  ) : (
                    <Megaphone className="h-4 w-4" strokeWidth={2.3} />
                  )}
                  {busy ? t("sending") : t("send")}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Card>

      <Toast message={toast} />
    </div>
  );
}
