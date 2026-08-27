import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Protected from "@/components/app/Protected";
import Index from "./pages/Index";
import Bookings from "./pages/Bookings";
import BookingCard from "./pages/BookingCard";
import Services from "./pages/Services";
import { Transport, House, Hotel, Banya } from "./pages/Objects";
import Trophies from "./pages/Trophies";
import Locations from "./pages/Locations";
import Reviews from "./pages/Reviews";
import Club from "./pages/Club";
import GuestCard from "./pages/GuestCard";
import Finance from "./pages/Finance";
import Staff from "./pages/Staff";
import Archive from "./pages/Archive";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const guard = (el: JSX.Element, ownerOnly = false) => (
  <Protected ownerOnly={ownerOnly}>{el}</Protected>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={guard(<Index />)} />
            <Route path="/bookings" element={guard(<Bookings />)} />
            <Route path="/bookings/:id" element={guard(<BookingCard />)} />
            <Route path="/services" element={guard(<Services />)} />
            <Route path="/transport" element={guard(<Transport />)} />
            <Route path="/house" element={guard(<House />)} />
            <Route path="/hotel" element={guard(<Hotel />)} />
            <Route path="/banya" element={guard(<Banya />)} />
            <Route path="/trophies" element={guard(<Trophies />)} />
            <Route path="/locations" element={guard(<Locations />)} />
            <Route path="/reviews" element={guard(<Reviews />)} />
            <Route path="/club" element={guard(<Club />)} />
            <Route path="/club/:id" element={guard(<GuestCard />)} />
            <Route path="/finance" element={guard(<Finance />, true)} />
            <Route path="/staff" element={guard(<Staff />, true)} />
            <Route path="/archive" element={guard(<Archive />, true)} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
