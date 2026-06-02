import { motion, useReducedMotion } from "framer-motion";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "../lib/auth";
import { t } from "../lib/i18n";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

/** Phase B will flesh out the operator panel. This stub keeps routing valid. */
export default function Panel() {
  const reduce = useReducedMotion();
  const nav = useNavigate();

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted px-4">
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="w-full max-w-sm"
      >
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <LayoutDashboard className="h-7 w-7 text-primary" strokeWidth={2.1} />
          </span>
          <h1 className="font-display text-xl font-extrabold">{t("panel")}</h1>
          <p className="text-sm text-muted-foreground">Panel — coming soon</p>
          <Button
            variant="outline"
            className="mt-2"
            onClick={() => {
              logout();
              nav("/login");
            }}
          >
            <LogOut className="h-4 w-4" strokeWidth={2.1} />
            {t("logout")}
          </Button>
        </Card>
      </motion.div>
    </div>
  );
}
