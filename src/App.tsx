import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/Home";
import { AppointmentPage } from "./pages/Appointment";
import { HakkimizdaPage } from "./pages/About";
import { IletisimPage } from "./pages/Contact";
import { AuthPage } from "./pages/Auth";
import { PsychologistDashboard } from "./pages/PsychologistDashboard";
import { ClientProfilePage } from "./pages/ClientProfile";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-right" closeButton duration={4000} />
      <BrowserRouter>

        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/randevu" element={<AppointmentPage />} />
            <Route path="/profil" element={<ClientProfilePage />} />
            <Route path="/giris" element={<AuthPage />} />
            <Route path="/kayit-ol" element={<AuthPage />} />
            <Route path="/panel/psikolog" element={<PsychologistDashboard />} />
            <Route path="/hakkimizda" element={<HakkimizdaPage />} />
            <Route path="/iletisim" element={<IletisimPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}


export default App;

