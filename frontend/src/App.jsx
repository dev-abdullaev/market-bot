import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Storefront from "./pages/storefront/Storefront.jsx";
import Checkout from "./pages/storefront/Checkout.jsx";
import Panel from "./pages/panel/Panel.jsx";
import RegisterStore from "./pages/webapp/RegisterStore.jsx";
import ProductForm from "./pages/webapp/ProductForm.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/shop/:slug" element={<Storefront />} />
      <Route path="/shop/:slug/checkout" element={<Checkout />} />
      <Route path="/webapp/register" element={<RegisterStore />} />
      <Route path="/webapp/product" element={<ProductForm />} />
      <Route path="/webapp/product/:id" element={<ProductForm />} />
      <Route path="/panel" element={<ProtectedRoute><Panel /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
