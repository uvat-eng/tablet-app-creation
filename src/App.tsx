import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import Protected from "@/components/app/Protected";
import Index from "./pages/Index";
import Bookings from "./pages/Bookings";
import BookingCard from "./pages/BookingCard";
import Documents from "./pages/Documents";
import ActCard from "./pages/ActCard";
import ReceiptCard from "./pages/ReceiptCard";
import ExpenseAct from "./pages/ExpenseAct";
import Services from "./pages/Services";
import { Transport } from "./pages/Objects";
import House from "./pages/House";
import Hotel from "./pages/Hotel";
import Banya from "./pages/Banya";
import TrophyHall from "./pages/TrophyHall";
import Trophies from "./pages/Trophies";
import Locations from "./pages/Locations";
import LocationCard from "./pages/LocationCard";
import MapPage from "./pages/MapPage";
import Reviews from "./pages/Reviews";
import Club from "./pages/Club";
import Hunters from "./pages/Hunters";
import HunterCard from "./pages/HunterCard";
import Biotech from "./pages/Biotech";
import ClubFees from "./pages/ClubFees";
import GuestCard from "./pages/GuestCard";
import Finance from "./pages/Finance";
import OfficeFinance from "./pages/OfficeFinance";
import Staff from "./pages/Staff";
import Settings from "./pages/Settings";
import Archive from "./pages/Archive";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const guard = (el: JSX.Element, section?: string, ownerOnly = false) => (
  <Protected section={section} ownerOnly={ownerOnly}>
    {el}
  </Protected>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={guard(<Index />, 'dashboard')} />
            <Route path="/bookings" element={guard(<Bookings />, 'bookings')} />
            <Route path="/bookings/:id" element={guard(<BookingCard />, 'bookings')} />
            <Route path="/documents" element={guard(<Documents />, 'checks')} />
            <Route path="/documents/act/:id" element={guard(<ActCard />, 'checks')} />
            <Route path="/documents/receipt/:id" element={guard(<ReceiptCard />, 'checks')} />
            <Route path="/documents/expenses/:id" element={guard(<ExpenseAct />, 'checks')} />
            <Route path="/services" element={guard(<Services />, 'services')} />
            <Route path="/transport" element={guard(<Transport />, 'transport')} />
            <Route path="/house" element={guard(<House />, 'house')} />
            <Route path="/house/:category" element={guard(<House />, 'house')} />
            <Route path="/hotel" element={guard(<Hotel />, 'hotel')} />
            <Route path="/hotel/:category" element={guard(<Hotel />, 'hotel')} />
            <Route path="/banya" element={guard(<Banya />, 'banya')} />
            <Route path="/banya/:category" element={guard(<Banya />, 'banya')} />
            <Route path="/trophies" element={guard(<TrophyHall />, 'trophies')} />
            <Route path="/trophies/catalog" element={guard(<Trophies />, 'trophies')} />
            <Route path="/trophies/:category" element={guard(<TrophyHall />, 'trophies')} />
            <Route path="/locations" element={guard(<Locations />, 'locations')} />
            <Route path="/locations/:kind" element={guard(<Locations />, 'locations')} />
            <Route path="/locations/:kind/:id" element={guard(<LocationCard />, 'locations')} />
            <Route path="/map" element={guard(<MapPage />, 'map')} />
            <Route path="/reviews" element={guard(<Reviews />, 'reviews')} />
            <Route path="/club" element={guard(<Club />, 'club')} />
            <Route path="/club/fees" element={guard(<ClubFees />, 'club')} />
            <Route path="/club/:id" element={guard(<GuestCard />, 'club')} />
            <Route path="/hunters" element={guard(<Hunters />, 'hunters')} />
            <Route path="/hunters/:id" element={guard(<HunterCard />, 'hunters')} />
            <Route path="/biotech" element={guard(<Biotech />, 'biotech')} />
            <Route path="/finance" element={guard(<Finance />, 'finance')} />
            <Route path="/office" element={guard(<OfficeFinance />, 'office')} />
            <Route path="/staff" element={guard(<Staff />, undefined, true)} />
            <Route path="/settings" element={guard(<Settings />, undefined, true)} />
            <Route path="/archive" element={guard(<Archive />, 'archive')} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;