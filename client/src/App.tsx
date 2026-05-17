import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import ChatAdd from "./pages/ChatAdd";
import LabAssistant from "@/pages/LabAssistant";
import DilutionCalculator from "@/pages/DilutionCalculator";
import ResearchTools from "@/pages/ResearchTools";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/chat" component={ChatAdd} />
        <Route path="/lab-assistant" component={LabAssistant} />
        <Route path="/dilution-calculator" component={DilutionCalculator} />
        <Route path="/research-tools" component={ResearchTools} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
