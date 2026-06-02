import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Storefront from "./pages/Storefront";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Panel from "./pages/Panel";
import RegisterStore from "./pages/webapp/RegisterStore";
import ProductForm from "./pages/webapp/ProductForm";
import ProtectedRoute from "./components/ProtectedRoute";

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

        {/* Operator panel (Phase B) — guarded */}
        <Route
          path="/panel/*"
          element={
            <ProtectedRoute>
              <Panel />
            </ProtectedRoute>
          }
        />

        {/* Default → demo store */}
        <Route path="/" element={<Navigate to="/shop/demo-shop" replace />} />
        <Route path="*" element={<Navigate to="/shop/demo-shop" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
