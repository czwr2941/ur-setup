import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { LangProvider } from "./contexts/LangContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

import Loader from "./components/sections/Loader";
import PromoBanner from "./components/sections/PromoBanner";
import Header from "./components/sections/Header";
import Hero from "./components/sections/Hero";
import About from "./components/sections/About";
import WhyUs from "./components/sections/WhyUs";
import Reviews from "./components/sections/Reviews";
import Testimonials from "./components/sections/Testimonials";
import Stats from "./components/sections/Stats";
import FAQ from "./components/sections/FAQ";
import Newsletter from "./components/sections/Newsletter";
import Contact from "./components/sections/Contact";
import ComingSoon from "./components/sections/ComingSoon";
import Products from "./components/sections/Products";
import Footer from "./components/sections/Footer";
import FloatingWidgets from "./components/sections/FloatingWidgets";

// Legacy studio admin (kept intact)
import AdminLogin from "./admin/AdminLogin";
import AdminLayout from "./admin/AdminLayout";
import AdminOverview from "./admin/pages/AdminOverview";
import AdminReviews from "./admin/pages/AdminReviews";
import AdminComingSoon from "./admin/pages/AdminComingSoon";
import AdminPromo from "./admin/pages/AdminPromo";
import AdminNewsletter from "./admin/pages/AdminNewsletter";
import AdminUsers from "./admin/pages/AdminUsers";

// UR SETUP OS
import OSLogin from "./os/OSLogin";
import OSLayout from "./os/OSLayout";
import OSAuthCallback from "./os/OSAuthCallback";
import OSDashboard from "./os/pages/OSDashboard";
import OSEmployees from "./os/pages/OSEmployees";
import OSLogs from "./os/pages/OSLogs";
import OSSettings from "./os/pages/OSSettings";
import OSComingSoon from "./os/pages/OSComingSoon";

const TOASTER_OPTIONS = {
  style: {
    background: "#0f0f0f",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff",
  },
};

function PublicSite() {
  return (
    <>
      <Loader />
      <div className="grain min-h-screen">
        <PromoBanner />
        <Header />
        <main>
          <Hero />
          <Products />
          <About />
          <WhyUs />
          <Reviews />
          <Testimonials />
          <Stats />
          <FAQ />
          <Newsletter />
          <Contact />
          <ComingSoon />
        </main>
        <Footer />
        <FloatingWidgets />
      </div>
    </>
  );
}

function AppRouter() {
  const location = useLocation();
  // Handle Emergent Google OAuth callback (hash based) at /os or /
  if (location.hash && location.hash.includes("session_id=") &&
      (location.pathname === "/os" || location.pathname === "/os/" || location.pathname === "/")) {
    return <OSAuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<PublicSite />} />

      {/* Legacy studio admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="coming-soon" element={<AdminComingSoon />} />
        <Route path="promo" element={<AdminPromo />} />
        <Route path="newsletter" element={<AdminNewsletter />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      {/* UR SETUP OS */}
      <Route path="/os/login" element={<OSLogin />} />
      <Route path="/os" element={<OSLayout />}>
        <Route index element={<OSDashboard />} />
        <Route path="orders" element={<OSComingSoon moduleKey="orders" />} />
        <Route path="customers" element={<OSComingSoon moduleKey="customers" />} />
        <Route path="products" element={<OSComingSoon moduleKey="products" />} />
        <Route path="marketing" element={<OSComingSoon moduleKey="marketing" />} />
        <Route path="support" element={<OSComingSoon moduleKey="support" />} />
        <Route path="employees" element={<OSEmployees />} />
        <Route path="analytics" element={<OSComingSoon moduleKey="analytics" />} />
        <Route path="logs" element={<OSLogs />} />
        <Route path="settings" element={<OSSettings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <LangProvider>
            <AppRouter />
            <Toaster position="top-center" theme="dark" toastOptions={TOASTER_OPTIONS} />
          </LangProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
