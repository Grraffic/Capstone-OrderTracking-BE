import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminDashboard from "./admin/pages/AdminDashboard";
import Inventory from "./admin/pages/Inventory";
import Orders from "./admin/pages/Orders";
import Settings from "./admin/pages/Settings";
import AuthCallback from "./pages/AuthCallback";
import ProductCategories from "./student/pages/ProductCategories";
import StudentDashboard from "./student/pages/StudentDashboard";
import AllProducts from "./student/pages/AllProducts";
import ProductDetailsPage from "./student/pages/ProductDetailsPage";
import MyCart from "./student/pages/MyCart";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: "#363636",
                  color: "#fff",
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: "#e68b00",
                    secondary: "#fff",
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "#fff",
                  },
                },
              }}
            />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Product Categories - protected for students */}
              <Route
                path="/product-categories"
                element={
                  <ProtectedRoute requiredRoles={["student"]}>
                    <ProductCategories />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes - protected to admin role */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/inventory"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <Inventory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* Student dashboard - protected */}
              <Route
                path="/student-dashboard"
                element={
                  <ProtectedRoute requiredRoles={["student"]}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />

              {/* All Products page - protected for students */}
              <Route
                path="/all-products"
                element={
                  <ProtectedRoute requiredRoles={["student"]}>
                    <AllProducts />
                  </ProtectedRoute>
                }
              />

              {/* Product Details page - protected for students */}
              <Route
                path="/products/:productId"
                element={
                  <ProtectedRoute requiredRoles={["student"]}>
                    <ProductDetailsPage />
                  </ProtectedRoute>
                }
              />

              {/* My Cart page - protected for students */}
              <Route
                path="/student/cart"
                element={
                  <ProtectedRoute requiredRoles={["student"]}>
                    <MyCart />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </div>
  );
}
