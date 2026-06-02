import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Storefront from "./pages/Storefront";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/shop/:slug" element={<Storefront />} />
        {/* Convenience redirect to the demo store */}
        <Route path="/" element={<Navigate to="/shop/demo-shop" replace />} />
        <Route path="*" element={<Navigate to="/shop/demo-shop" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
