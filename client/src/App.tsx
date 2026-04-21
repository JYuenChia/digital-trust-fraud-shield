import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Navigation from "./components/Navigation";
import TourOverlay from "./components/TourOverlay";
import { FraudEventsProvider } from "./contexts/FraudEventsContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TourProvider } from "./contexts/TourContext";
import Landing from "./pages/Landing";
import Transaction from "./pages/Transaction";
import SwipeShield from "./pages/SwipeShield";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import GuardianDemo from "./pages/GuardianDemo";
import Admin from "./pages/Admin";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Landing} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/transaction"} component={Transaction} />
      <Route path={"/swipe-shield"} component={SwipeShield} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/guardian-notifications"} component={GuardianDemo} />
      <Route path={"/guardian-demo"} component={GuardianDemo} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <LanguageProvider>
          <TooltipProvider>
            <FraudEventsProvider>
              <TourProvider>
                <Navigation />
                <Toaster />
                <Router />
                <TourOverlay />
              </TourProvider>
            </FraudEventsProvider>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
