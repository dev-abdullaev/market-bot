import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Storefront from "./pages/Storefront";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Panel from "./pages/Panel";
import OrdersPage from "./pages/panel/OrdersPage";
import ProductsPage from "./pages/panel/ProductsPage";
import MenuConstructor from "./pages/panel/MenuConstructor";
import CategoriesPage from "./pages/panel/CategoriesPage";
import ClientsPage from "./pages/panel/ClientsPage";
import BroadcastPage from "./pages/panel/BroadcastPage";
import PromosPage from "./pages/panel/PromosPage";
import SettingsPage from "./pages/panel/SettingsPage";
import FasovkaPage from "./pages/panel/FasovkaPage";
import SegmentsPage from "./pages/panel/SegmentsPage";
import RegisterStore from "./pages/webapp/RegisterStore";
import ProductForm from "./pages/webapp/ProductForm";
import ProtectedRoute from "./components/ProtectedRoute";

const Dashboard = lazy(() => import("./pages/panel/Dashboard"));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Storefront + customer checkout */}
        <Route path="/shop/:slug" element={<Storefront />} />
        <Route path="/shop/:slug/checkout" element={<Checkout />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* Telegram WebApp forms (auto-login on mount) */}
        <Route path="/webapp/register" element={<RegisterStore />} />
        <Route path="/webapp/product" element={<ProductForm />} />
        <Route path="/webapp/product/:id" element={<ProductForm />} />

        {/* Operator panel (Phase B) — guarded, nested sections */}
        <Route
          path="/panel"
          element={
            <ProtectedRoute>
              <Panel />
            </ProtectedRoute>
          }
        >
          <Route index element={<Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Yuklanmoqda...</div>}><Dashboard /></Suspense>} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="menu" element={<MenuConstructor />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="broadcast" element={<BroadcastPage />} />
          <Route path="promos" element={<PromosPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="fasovka" element={<FasovkaPage />} />
          <Route path="segments" element={<SegmentsPage />} />
        </Route>

        {/* Default → demo store */}
        <Route path="/" element={<Navigate to="/shop/demo-shop" replace />} />
        <Route path="*" element={<Navigate to="/shop/demo-shop" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
