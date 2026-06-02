import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  XCircle,
} from "lucide-react";
import api from "../../lib/api";
import { t } from "../../lib/i18n";
import { cn } from "../../lib/cn";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { ErrorAlert } from "../ui/Alert";
import { Modal } from "../ui/Modal";

// Column order for both paste-parsing and the downloadable template.
const COLUMNS = [
  { key: "category_1", labelKey: "import_col_cat1" },
  { key: "category_2", labelKey: "import_col_cat2" },
  { key: "category_3", labelKey: "import_col_cat3" },
  { key: "name_ru", labelKey: "import_col_name_ru" },
  { key: "name_uz", labelKey: "import_col_name_uz" },
  { key: "description_ru", labelKey: "import_col_desc_ru" },
  { key: "description_uz", labelKey: "import_col_desc_uz" },
  { key: "price", labelKey: "import_col_price" },
  { key: "unit", labelKey: "import_col_unit" },
  { key: "barcode", labelKey: "import_col_barcode" },
  { key: "ikpu", labelKey: "import_col_ikpu" },
];

const SAMPLE = [
  ["Oziq-ovqat", "Ichimliklar", "Suv", "Вода 1л", "Suv 1l", "", "", "5000", "dona", "4780000000001", "01001"],
  ["Oziq-ovqat", "Shirinliklar", "", "Шоколад", "Shokolad", "", "", "12000", "dona", "4780000000002", "01002"],
  ["Maishiy", "Tozalash", "", "Мыло", "Sovun", "", "", "8000", "dona", "4780000000003", "01003"],
];

/** Parse pasted TSV (tab-separated) text into row objects by column position. */
function parseTsv(text) {
  if (!text) return [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  const rows = [];
  for (const line of lines) {
    const cells = line.split("\t");
    // Skip a header row if the first cell matches a known header label.
    const first = (cells[0] || "").trim().toLowerCase();
    if (
      first === "kategoriya 1" ||
      first === "категория 1" ||
      first === "category_1"
    ) {
      continue;
    }
    const row = {};
    COLUMNS.forEach((c, i) => {
      row[c.key] = (cells[i] ?? "").trim();
    });
    // Require at least one name to count the row as meaningful.
    if (row.name_ru || row.name_uz) rows.push(row);
  }
  return rows;
}

/** Build + download a CSV template (Excel opens it natively). */
function downloadTemplate() {
  const header = COLUMNS.map((c) => t(c.labelKey));
  const lines = [header, ...SAMPLE]
    .map((cols) =>
      cols
        .map((v) => {
          const s = String(v ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob(["﻿" + lines], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mahsulotlar-shablon.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ImportModal({ open, onOpenChange, onImported }) {
  const reduce = useReducedMotion();
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);

  const rows = useMemo(() => parseTsv(raw), [raw]);

  const reset = () => {
    setRaw("");
    setErr("");
    setResult(null);
  };

  const submit = async () => {
    if (rows.length === 0) {
      setErr(t("import_empty"));
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/products/import", { rows });
      setResult({
        created: data?.created ?? 0,
        skipped: data?.skipped ?? 0,
        errors: Array.isArray(data?.errors) ? data.errors : [],
      });
      onImported?.();
    } catch (e2) {
      setErr(e2?.response?.data?.detail || t("error"));
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <div className="flex items-center gap-3 pb-4 pr-10">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <FileSpreadsheet className="h-6 w-6" strokeWidth={2.1} />
      </span>
      <h2 className="font-display text-lg font-extrabold text-foreground">
        {t("import_title")}
      </h2>
    </div>
  );

  const footer = result ? (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        onClick={() => {
          reset();
        }}
      >
        {t("p_import")}
      </Button>
      <Button onClick={() => onOpenChange(false)}>{t("save")}</Button>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" onClick={downloadTemplate} className="gap-2">
        <Download className="h-4 w-4" strokeWidth={2.2} />
        <span className="hidden sm:inline">{t("import_download")}</span>
        <span className="sm:hidden">.xlsx</span>
      </Button>
      <Button onClick={submit} disabled={busy || rows.length === 0} className="min-w-32">
        {busy ? <Spinner className="text-primary-foreground" size={16} /> : null}
        {busy ? t("saving") : t("import_next")}
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
      title={t("import_title")}
      header={header}
      footer={footer}
      size="xl"
    >
      <AnimatePresence mode="wait" initial={false}>
        {result ? (
          <motion.div
            key="result"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-accent/30 bg-accent/5 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-accent" strokeWidth={2} />
              <p className="font-display text-base font-extrabold text-foreground">
                {t("import_done")}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ResultStat
                value={result.created}
                label={t("import_result_created")}
                tone="accent"
              />
              <ResultStat
                value={result.skipped}
                label={t("import_result_skipped")}
                tone="amber"
              />
              <ResultStat
                value={result.errors.length}
                label={t("import_result_errors")}
                tone="destructive"
              />
            </div>
            {result.errors.length ? (
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                {result.errors.map((e, i) => (
                  <p
                    key={i}
                    className="flex items-start gap-2 text-xs font-semibold text-destructive"
                  >
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {typeof e === "string" ? e : JSON.stringify(e)}
                  </p>
                ))}
              </div>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-sm font-semibold text-primary">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
              <span>{t("import_cat_hint")}</span>
            </div>

            {/* Sample table */}
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("import_sample")}
              </p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted">
                      {COLUMNS.map((c) => (
                        <th
                          key={c.key}
                          className="whitespace-nowrap px-2.5 py-2 text-left font-bold text-muted-foreground"
                        >
                          {t(c.labelKey)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {r.map((cell, j) => (
                          <td
                            key={j}
                            className="whitespace-nowrap px-2.5 py-1.5 text-foreground"
                          >
                            {cell || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paste area */}
            <div>
              <label
                htmlFor="import-paste"
                className="mb-1.5 block text-sm font-bold text-foreground"
              >
                {t("import_paste_label")}
              </label>
              <textarea
                id="import-paste"
                rows={5}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={t("import_paste_ph")}
                className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground shadow-soft transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-bold",
                    rows.length ? "text-accent" : "text-muted-foreground"
                  )}
                >
                  {t("import_detected").replace("{n}", String(rows.length))}
                </span>
              </div>
            </div>

            <ErrorAlert message={err} />

            {/* Parsed preview */}
            <AnimatePresence initial={false}>
              {rows.length ? (
                <motion.div
                  initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="max-h-52 overflow-auto rounded-xl border border-border">
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-0">
                        <tr className="bg-muted">
                          {COLUMNS.map((c) => (
                            <th
                              key={c.key}
                              className="whitespace-nowrap px-2.5 py-2 text-left font-bold text-muted-foreground"
                            >
                              {t(c.labelKey)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} className="border-t border-border">
                            {COLUMNS.map((c) => (
                              <td
                                key={c.key}
                                className="whitespace-nowrap px-2.5 py-1.5 text-foreground"
                              >
                                {r[c.key] || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

function ResultStat({ value, label, tone }) {
  const tones = {
    accent: "border-accent/30 bg-accent/5 text-accent",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-600",
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
  };
  return (
    <div className={cn("rounded-2xl border p-4 text-center", tones[tone])}>
      <p className="font-display text-2xl font-extrabold">{value}</p>
      <p className="mt-0.5 text-xs font-bold opacity-80">{label}</p>
    </div>
  );
}
