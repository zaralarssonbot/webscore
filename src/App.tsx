import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";

const Admin = lazy(() => import("./pages/Admin.tsx"));
const Pricing = lazy(() => import("./pages/Pricing.tsx"));
const ServicePage = lazy(() => import("./pages/ServicePage.tsx"));
const GuidesIndex = lazy(() => import("./pages/GuidesIndex.tsx"));
const GuideArticle = lazy(() => import("./pages/GuideArticle.tsx"));
const Integritetspolicy = lazy(() => import("./pages/Integritetspolicy.tsx"));
const ReportPage = lazy(() => import("./pages/ReportPage.tsx"));
// M5 accounts (additive; ship dark behind VITE_ACCOUNTS_ENABLED).
import ProtectedRoute from "./components/auth/ProtectedRoute.tsx";
const LoginPage = lazy(() => import("./pages/LoginPage.tsx"));
const AuthCallback = lazy(() => import("./pages/AuthCallback.tsx"));
const AppLayout = lazy(() => import("./components/app/AppLayout.tsx"));
const DashboardPage = lazy(() => import("./pages/app/DashboardPage.tsx"));
const DomainsPage = lazy(() => import("./pages/app/DomainsPage.tsx"));
const DomainDetailPage = lazy(() => import("./pages/app/DomainDetailPage.tsx"));
const HistoryPage = lazy(() => import("./pages/app/HistoryPage.tsx"));
const SettingsPage = lazy(() => import("./pages/app/SettingsPage.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/tjanster/:slug" element={<ServicePage />} />
              <Route path="/guider" element={<GuidesIndex />} />
              <Route path="/guider/:slug" element={<GuideArticle />} />
              <Route path="/integritetspolicy" element={<Integritetspolicy />} />
              <Route path="/analys/:reportId" element={<ReportPage />} />
              {/* M5 accounts (additive) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="domains" element={<DomainsPage />} />
                <Route path="domains/:id" element={<DomainDetailPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
