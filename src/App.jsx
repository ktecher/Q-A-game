import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
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

export default function App() {
  // Provider nesting (outer → inner): QueryClient → Theme → Auth → Game → Router. Inner providers may depend on outer ones.
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
