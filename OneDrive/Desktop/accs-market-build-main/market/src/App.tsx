import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EscrowProvider } from "@/contexts/EscrowContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import AccountDetail from "./pages/AccountDetail";
import CreateListing from "./pages/CreateListing";
import Messages from "./pages/Messages";
import ChatDetail from "./pages/ChatDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import AdminRoles from "./pages/AdminRoles";
import EscrowAgentDashboard from "./pages/EscrowAgentDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EscrowProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/account/:id" element={<AccountDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route path="/create-listing" element={
                <ProtectedRoute>
                  <CreateListing />
                </ProtectedRoute>
              } />
              <Route path="/messages" element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              } />
              <Route path="/chat/:id" element={
                <ProtectedRoute>
                  <ChatDetail />
                </ProtectedRoute>
              } />
              <Route path="/admin/roles" element={
                <ProtectedRoute>
                  <AdminRoles />
                </ProtectedRoute>
              } />
              <Route path="/escrow-dashboard" element={
                <ProtectedRoute>
                  <EscrowAgentDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </EscrowProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
