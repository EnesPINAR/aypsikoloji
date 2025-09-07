import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function Layout() {
  const location = useLocation();
  const showFooter = location.pathname !== "/";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <Outlet /> {/* Sayfa içeriği burada görünecek */}
      {showFooter && <Footer />}
    </div>
  );
}
