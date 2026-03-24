import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthPage from "./pages/AuthPage";
import GameLibrary from "./pages/GameLibrary";
import FlappyBirdGame from "./pages/FlappyBirdGame";
import PongGame from "./pages/PongGame";
import CarDodgeGame from "./pages/CarDodgeGame";
import BrickBreakerGame from "./pages/BrickBreakerGame";
import FruitCatchGame from "./pages/FruitCatchGame";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<GameLibrary />} />
          <Route path="/flappy-bird" element={<FlappyBirdGame />} />
          <Route path="/pong" element={<PongGame />} />
          <Route path="/car-dodge" element={<CarDodgeGame />} />
          <Route path="/brick-breaker" element={<BrickBreakerGame />} />
          <Route path="/fruit-catch" element={<FruitCatchGame />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
