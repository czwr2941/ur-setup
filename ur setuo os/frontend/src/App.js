import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { LangProvider } from "./contexts/LangContext";
import { AuthProvider } from "./contexts/AuthContext";

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

// import Products from "./components/sections/Products";
// import About from "./components/sections/About";
// import WhyUs from "./components/sections/WhyUs";
// import Reviews from "./components/sections/Reviews";
// import Testimonials from "./components/sections/Testimonials";
// import Stats from "./components/sections/Stats";
// import FAQ from "./components/sections/FAQ";
// import Newsletter from "./components/sections/Newsletter";
// import Contact from "./components/sections/Contact";
// import ComingSoon from "./components/sections/ComingSoon";

import Footer from "./components/sections/Footer";
import FloatingWidgets from "./components/sections/FloatingWidgets";

import AdminLogin from "./admin/AdminLogin";
import AdminLayout from "./admin/AdminLayout";
import AdminOverview from "./admin/pages/AdminOverview";
import AdminReviews from "./admin/pages/AdminReviews";
import AdminComingSoon from "./admin/pages/AdminComingSoon";
import AdminPromo from "./admin/pages/AdminPromo";
import AdminNewsletter from "./admin/pages/AdminNewsletter";
import AdminUsers from "./admin/pages/AdminUsers";

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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LangProvider>
          <Routes>
            <Route path="/" element={<PublicSite />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="coming-soon" element={<AdminComingSoon />} />
              <Route path="promo" element={<AdminPromo />} />
              <Route path="newsletter" element={<AdminNewsletter />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>
          </Routes>
          <Toaster
            position="top-center"
            theme="dark"
            toastOptions={TOASTER_OPTIONS}
          />
        </LangProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
