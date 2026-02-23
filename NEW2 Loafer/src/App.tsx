import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import ProductManagement from './pages/ProductManagement';
import StylingList from './pages/StylingList';
import StylingDetail from './pages/StylingDetail';
import StylingManagement from './pages/StylingManagement';
import Cart from './pages/Cart';
import CheckoutSuccess from './pages/CheckoutSuccess';
import About from './pages/About';
import Details from './pages/Details';
import DesignPhilosophy from './pages/DesignPhilosophy';
import Maintenance from './pages/Maintenance';
import Contact from './pages/Contact';
import Login from './pages/Login';
import MyAccount from './pages/MyAccount';
import AdminDashboard from './pages/AdminDashboard';
import AccountManagement from './pages/AccountManagement';
import Analytics from './pages/Analytics';
import OrderManagement from './pages/OrderManagement';
import WardrobePage from './wardrobe/WardrobePage';
import InfoPage from './pages/InfoPage';
import Ambassador from './pages/Ambassador';
import OnboardingModal from './wardrobe/components/OnboardingModal';

function App() {
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();
  const isLoginPage = location.pathname === '/login';

  // オンボーディング表示フラグ
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // ログイン済みかつプロフィール取得済みで、オンボーディング未完了の場合に表示
    if (!authLoading && user && profile && !profile.onboarding_completed) {
      setShowOnboarding(true);
    }
  }, [authLoading, user, profile]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 初回ログインオンボーディング（他の操作をブロック） */}
      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      {!isLoginPage && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:slug" element={<ProductDetail />} />
        <Route path="/styling" element={<StylingList />} />
        <Route path="/styling/:slug" element={<StylingDetail />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/my-account"
          element={
            <ProtectedRoute>
              <MyAccount />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute adminOnly>
              <ProductManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/styling"
          element={
            <ProtectedRoute adminOnly>
              <StylingManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/accounts"
          element={
            <ProtectedRoute adminOnly>
              <AccountManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute adminOnly>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute adminOnly>
              <OrderManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/wardrobe"
          element={
            <ProtectedRoute adminOnly>
              <WardrobePage />
            </ProtectedRoute>
          }
        />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
        <Route path="/about" element={<About />} />
        <Route path="/details" element={<Details />} />
        <Route path="/design-philosophy" element={<DesignPhilosophy />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/contact" element={<Contact />} />
        {/* 情報ページ（利用規約・プライバシーポリシー等） */}
        <Route path="/terms" element={<InfoPage slug="terms" />} />
        <Route path="/privacy" element={<InfoPage slug="privacy" />} />
        {/* アンバサダーページ */}
        <Route path="/ambassador" element={<Ambassador />} />
      </Routes>
      {!isLoginPage && <Footer />}
      {!isLoginPage && <ScrollToTop />}
    </div>
  );
}

export default App;
