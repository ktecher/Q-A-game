import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { GameProvider } from './contexts/GameContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingScreen from './screens/LandingScreen';
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import SetupScreen from './screens/SetupScreen';
import RevealScreen from './screens/RevealScreen';
import BoardScreen from './screens/BoardScreen';
import QuestionScreen from './screens/QuestionScreen';
import ResultsScreen from './screens/ResultsScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <GameProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingScreen />} />
            <Route path="/signin" element={<SignInScreen />} />
            <Route path="/signup" element={<SignUpScreen />} />
            <Route path="/setup" element={<SetupScreen />} />
            <Route path="/reveal" element={<RevealScreen />} />
            <Route path="/play" element={<BoardScreen />} />
            <Route path="/play/question" element={<QuestionScreen />} />
            <Route path="/play/results" element={<ResultsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </GameProvider>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
