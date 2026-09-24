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
import HuntRequests from "./pages/HuntRequests";
import Supply from "./pages/Supply";
import Account from "./pages/Account";
import Access from "./pages/Access";
import UpdateBar from "@/components/app/UpdateBar";
import SupplyNew from "./pages/SupplyNew";
import BookingCard from "./pages/BookingCard";
import Documents from "./pages/Documents";
import Permits from "./pages/Permits";
import Files from "./pages/Files";
import ActCard from "./pages/ActCard";
import ReceiptCard from "./pages/ReceiptCard";
import ExpenseAct from "./pages/ExpenseAct";
import Services from "./pages/Services";
import Transport from "./pages/Transport";
import TransportCard from "./pages/TransportCard";
import House from "./pages/House";
import Hotel from "./pages/Hotel";
import Banya from "./pages/Banya";
import TrophyHall from "./pages/TrophyHall";
import Trophies from "./pages/Trophies";
import Locations from "./pages/Locations";
import LocationCard from "./pages/LocationCard";
import MapPage from "./pages/MapPage";
import Reviews from "./pages/Reviews";
import Reports from "./pages/Reports";
import Club from "./pages/Club";
import Hunters from "./pages/Hunters";
import HunterCard from "./pages/HunterCard";
import Biotech from "./pages/Biotech";
import ClubFees from "./pages/ClubFees";
import GuestCard from "./pages/GuestCard";
import Finance from "./pages/Finance";
import OfficeFinance from "./pages/OfficeFinance";
import Transfers from "./pages/Transfers";
import WeaponTransfer from "./pages/WeaponTransfer";
import Staff from "./pages/Staff";
import Settings from "./pages/Settings";
import Archive from "./pages/Archive";
import Download from "./pages/Download";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import MyHome from "./pages/my/MyHome";
import MyBiotech from "./pages/my/MyBiotech";
import MyClub from "./pages/my/MyClub";
import ClubChat from "./pages/my/ClubChat";
import MyBag from "./pages/my/MyBag";
import MyProfile from "./pages/my/MyProfile";
import MyDocs from "./pages/my/MyDocs";
import MyWeapons from "./pages/my/MyWeapons";
import MyHuntPlans from "./pages/my/MyHuntPlans";
import MySettings from "./pages/my/MySettings";
import MyHunts from "./pages/my/MyHunts";
import MyPrice from "./pages/my/MyPrice";
import MyReview from "./pages/my/MyReview";
import SplashIntro from "./components/app/SplashIntro";

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
      <SplashIntro />
      <UpdateBar />
      <AuthProvider>
        <SettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={guard(<Index />, 'dashboard')} />
            <Route path="/my" element={guard(<MyHome />, 'my')} />
            <Route path="/my/club" element={guard(<MyClub />, 'my-club')} />
            <Route path="/club-chat" element={guard(<ClubChat />, 'club-chat')} />
            <Route path="/my/biotech" element={guard(<MyBiotech />, 'my-biotech')} />
            <Route path="/my/bag" element={guard(<MyBag />, 'my-bag')} />
            <Route path="/my/profile" element={guard(<MyProfile />, 'my-profile')} />
            <Route path="/my/docs" element={guard(<MyDocs />, 'my-docs')} />
            <Route path="/my/weapons" element={guard(<MyWeapons />, 'my-weapons')} />
            <Route path="/my/plans" element={guard(<MyHuntPlans />, 'my-plans')} />
            <Route path="/my/settings" element={guard(<MySettings />, 'my-settings')} />
            <Route path="/my/hunts" element={guard(<MyHunts />, 'my-hunts')} />
            <Route path="/my/price" element={guard(<MyPrice />, 'my-price')} />
            <Route path="/my/review" element={guard(<MyReview />, 'my-review')} />
            <Route path="/bookings" element={guard(<Bookings />, 'bookings')} />
            <Route path="/hunt-requests" element={guard(<HuntRequests />, 'hunt-requests')} />
            <Route path="/account" element={<Protected><Account /></Protected>} />
            <Route path="/access" element={guard(<Access />, 'access')} />
            <Route path="/supply" element={guard(<Supply />, 'supply')} />
            <Route path="/supply/new" element={guard(<SupplyNew />, 'supply-new')} />
            <Route path="/bookings/:id" element={guard(<BookingCard />, 'bookings')} />
            <Route path="/permits" element={guard(<Permits />, 'permits')} />
            <Route path="/documents" element={guard(<Documents />, 'checks')} />
            <Route path="/documents/act/:id" element={guard(<ActCard />, 'checks')} />
            <Route path="/documents/receipt/:id" element={guard(<ReceiptCard />, 'checks')} />
            <Route path="/documents/expenses/:id" element={guard(<ExpenseAct />, 'checks')} />
            <Route path="/files" element={guard(<Files />, 'files')} />
            <Route path="/services" element={guard(<Services />, 'services')} />
            <Route path="/transport" element={guard(<Transport />, 'transport')} />
            <Route path="/transport/:id" element={guard(<TransportCard />, 'transport')} />
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
            <Route path="/reports" element={guard(<Reports />, 'reports')} />
            <Route path="/club" element={guard(<Club />, 'club')} />
            <Route path="/club/fees" element={guard(<ClubFees />, 'club')} />
            <Route path="/club/:id" element={guard(<GuestCard />, 'club')} />
            <Route path="/hunters" element={guard(<Hunters />, 'hunters')} />
            <Route path="/hunters/:id" element={guard(<HunterCard />, 'hunters')} />
            <Route path="/biotech" element={guard(<Biotech />, 'biotech')} />
            <Route path="/finance" element={guard(<Finance />, 'finance')} />
            <Route path="/transfers" element={guard(<Transfers />, 'transfers')} />
            <Route
              path="/weapon-transfer"
              element={guard(<WeaponTransfer />, 'weapon-transfer')}
            />
            <Route path="/office" element={guard(<OfficeFinance />, 'office')} />
            <Route path="/staff" element={guard(<Staff />, undefined, true)} />
            <Route path="/settings" element={guard(<Settings />, undefined, true)} />
            <Route path="/archive" element={guard(<Archive />, 'archive')} />
            <Route path="/download" element={<Download />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/support" element={<Support />} />
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