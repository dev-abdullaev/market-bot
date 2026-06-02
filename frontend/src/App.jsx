import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Storefront from "./pages/storefront/Storefront.jsx";
import Checkout from "./pages/storefront/Checkout.jsx";
import Panel from "./pages/panel/Panel.jsx";
import Dashboard from "./pages/panel/Dashboard.jsx";
import OrdersTab from "./pages/panel/OrdersTab.jsx";
import ProductsTab from "./pages/panel/ProductsTab.jsx";
import CategoriesTab from "./pages/panel/CategoriesTab.jsx";
import ClientsPage from "./pages/panel/ClientsPage.jsx";
import BroadcastPage from "./pages/panel/BroadcastPage.jsx";
import PromosPage from "./pages/panel/PromosPage.jsx";
import SettingsPage from "./pages/panel/SettingsPage.jsx";
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
      <Route path="/panel" element={<ProtectedRoute><Panel /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<OrdersTab />} />
        <Route path="products" element={<ProductsTab />} />
        <Route path="categories" element={<CategoriesTab />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="broadcast" element={<BroadcastPage />} />
        <Route path="promos" element={<PromosPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
