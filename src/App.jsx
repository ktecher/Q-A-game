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
import ChallengeScreen from './screens/ChallengeScreen';
import ResultsScreen from './screens/ResultsScreen';
import Dashboard from './screens/Dashboard';
import OverviewPage from './screens/Dashboard/pages/OverviewPage';
import CategoriesPage from './screens/Dashboard/pages/CategoriesPage';
import QuestionsPage from './screens/Dashboard/pages/QuestionsPage';
import WalaKalmaPage from './screens/Dashboard/pages/WalaKalmaPage';
import ChallengePromptsPage from './screens/Dashboard/pages/ChallengePromptsPage';
import UsersPage from './screens/Dashboard/pages/UsersPage';
import DrawingWordsPage from './screens/Dashboard/pages/DrawingWordsPage';
import SettingsPage from './screens/Dashboard/pages/SettingsPage';

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
            <Route path="/play/challenge" element={<ChallengeScreen />} />
            <Route path="/play/results" element={<ResultsScreen />} />
            {/* Admin dashboard — reachable only by typing /dashboard. */}
            <Route path="/dashboard" element={<Dashboard />}>
              <Route index element={<OverviewPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="questions" element={<QuestionsPage />} />
              <Route path="wala-kalma" element={<WalaKalmaPage />} />
              <Route path="challenge-prompts" element={<ChallengePromptsPage />} />
              <Route path="drawing-words" element={<DrawingWordsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </GameProvider>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
