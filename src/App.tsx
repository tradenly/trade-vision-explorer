
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./views/Dashboard";
import ArbitrageAnalysis from "./pages/ArbitrageAnalysis";
import Settings from "./pages/Settings";
import { EthereumWalletProvider } from "./context/EthereumWalletContext";
import { SolanaWalletProvider } from "./context/SolanaWalletContext";
import AppWrapper from "./components/App";

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  }
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <EthereumWalletProvider>
        <SolanaWalletProvider>
          <AppWrapper>
            <BrowserRouter>
              <Routes>
                <Route path="/" Component={Index} />
                <Route path="/dashboard" Component={Dashboard} />
                <Route path="/arbitrage" Component={ArbitrageAnalysis} />
                <Route path="/settings" Component={Settings} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" Component={NotFound} />
              </Routes>
            </BrowserRouter>
          </AppWrapper>
        </SolanaWalletProvider>
      </EthereumWalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
