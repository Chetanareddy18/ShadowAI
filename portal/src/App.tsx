import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Threats from "./pages/Threats";
import Users from "./pages/Users";
import Orgs from "./pages/Orgs";
import Audit from "./pages/Audit";
import Chat from "./pages/Chat";
import AppLayout from "./components/AppLayout";
import { useSession } from "./store/session";

function Protected({ children }: { children: React.ReactNode }) {
  const { hydrate } = useSession();
  if (!hydrate()) return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/threats"   element={<Protected><Threats /></Protected>} />
      <Route path="/users"     element={<Protected><Users /></Protected>} />
      <Route path="/orgs"      element={<Protected><Orgs /></Protected>} />
      <Route path="/audit"     element={<Protected><Audit /></Protected>} />
      <Route path="/chat"      element={<Protected><Chat /></Protected>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}
