import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/Home";
import { AppointmentPage } from "./pages/Appointment";
import { HakkimizdaPage } from "./pages/About";
import { IletisimPage } from "./pages/Contact";
import { Toaster } from "@/components/ui/sonner";
import "./App.css";

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/randevu" element={<AppointmentPage />} />
            <Route path="/hakkimizda" element={<HakkimizdaPage />} />
            <Route path="/iletisim" element={<IletisimPage />} /> {/* YENİ */}
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
