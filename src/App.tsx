
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Bookings from "./pages/Bookings";
import Services from "./pages/Services";
import { Transport, House, Hotel, Banya } from "./pages/Objects";
import Trophies from "./pages/Trophies";
import Locations from "./pages/Locations";
import Reviews from "./pages/Reviews";
import Club from "./pages/Club";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/services" element={<Services />} />
          <Route path="/transport" element={<Transport />} />
          <Route path="/house" element={<House />} />
          <Route path="/hotel" element={<Hotel />} />
          <Route path="/banya" element={<Banya />} />
          <Route path="/trophies" element={<Trophies />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/club" element={<Club />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;