import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const Admin = lazy(() => import("./pages/Admin.tsx"));
const Pricing = lazy(() => import("./pages/Pricing.tsx"));
const ServicePage = lazy(() => import("./pages/ServicePage.tsx"));
const GuidesIndex = lazy(() => import("./pages/GuidesIndex.tsx"));
const GuideArticle = lazy(() => import("./pages/GuideArticle.tsx"));
const Integritetspolicy = lazy(() => import("./pages/Integritetspolicy.tsx"));
const ReportPage = lazy(() => import("./pages/ReportPage.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
