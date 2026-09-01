import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import { GameProvider } from './contexts/GameContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingScreen from './screens/LandingScreen';
import HomeScreen from './screens/HomeScreen';
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import SetupScreen from './screens/SetupScreen';
import RevealScreen from './screens/RevealScreen';
import BoardScreen from './screens/BoardScreen';
import QuestionScreen from './screens/QuestionScreen';
import ChallengeScreen from './screens/ChallengeScreen';
import ResultsScreen from './screens/ResultsScreen';

// The admin dashboard (CMS) is reachable only by typing /dashboard and is used
// by admins, never by players — so it is code-split out of the main bundle and
// loaded on demand. Keeps the player-facing initial download small.
const Dashboard = lazy(() => import('./screens/Dashboard'));
const OverviewPage = lazy(() => import('./screens/Dashboard/pages/OverviewPage'));
const CategoriesPage = lazy(() => import('./screens/Dashboard/pages/CategoriesPage'));
const QuestionsPage = lazy(() => import('./screens/Dashboard/pages/QuestionsPage'));
const WalaKalmaPage = lazy(() => import('./screens/Dashboard/pages/WalaKalmaPage'));
const ChallengePromptsPage = lazy(() => import('./screens/Dashboard/pages/ChallengePromptsPage'));
const UsersPage = lazy(() => import('./screens/Dashboard/pages/UsersPage'));
const DrawingWordsPage = lazy(() => import('./screens/Dashboard/pages/DrawingWordsPage'));
const SettingsPage = lazy(() => import('./screens/Dashboard/pages/SettingsPage'));

// Kout — a second game mode, reachable only by the host typing /kout, so it
// too is code-split out of the main bundle.
const KoutSetup = lazy(() => import('./screens/Kout/SetupScreen'));
const KoutTable = lazy(() => import('./screens/Kout/TableScreen'));
const KoutSeat = lazy(() => import('./screens/Kout/SeatScreen'));

export default function App() {
  // Provider nesting (outer → inner): QueryClient → Theme → Auth → Game → Router. Inner providers may depend on outer ones.
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <GameProvider>
        <BrowserRouter>
          <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<LandingScreen />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/signin" element={<SignInScreen />} />
            <Route path="/signup" element={<SignUpScreen />} />
            <Route path="/setup" element={<SetupScreen />} />
            <Route path="/reveal" element={<RevealScreen />} />
            <Route path="/play" element={<BoardScreen />} />
            <Route path="/play/question" element={<QuestionScreen />} />
            <Route path="/play/challenge" element={<ChallengeScreen />} />
            <Route path="/play/results" element={<ResultsScreen />} />
            {/* Kout — host setup and the table are typed URLs like /dashboard;
                the seat screen is reached by QR and must stay unauthenticated. */}
            <Route path="/kout" element={<KoutSetup />} />
            <Route path="/kout/table" element={<KoutTable />} />
            <Route path="/kout/seat" element={<KoutSeat />} />
            {/* Admin dashboard — reachable only by typing /dashboard, lazy-loaded. */}
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
          </Suspense>
        </BrowserRouter>
        </GameProvider>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
