import { useState } from "react";
import Layout from "../../components/Layout.jsx";
import ProductsTab from "./ProductsTab.jsx";
import CategoriesTab from "./CategoriesTab.jsx";
import OrdersTab from "./OrdersTab.jsx";
import { t } from "../../lib/i18n.js";

export default function Panel() {
  const [tab, setTab] = useState("orders");
  const tabs = [["orders", t("orders")], ["products", t("products")], ["categories", t("categories")]];
  return (
    <Layout title="Panel">
      <ul className="nav nav-tabs mb-3">
        {tabs.map(([k, label]) => (
          <li className="nav-item" key={k}>
            <button className={`nav-link ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{label}</button>
          </li>
        ))}
      </ul>
      {tab === "orders" && <OrdersTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "categories" && <CategoriesTab />}
    </Layout>
  );
}
