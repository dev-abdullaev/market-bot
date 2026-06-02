import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import AdminShell from "../../components/AdminShell.jsx";
import api from "../../lib/api.js";

export default function Panel() {
  const [storeName, setStoreName] = useState("");
  useEffect(() => {
    api.get("/stores/me").then((r) => setStoreName(r.data.name || "")).catch(() => {});
  }, []);
  return (
    <AdminShell storeName={storeName}>
      <Outlet />
    </AdminShell>
  );
}
