import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // WSL + /mnt/c/ files: inotify is unreliable, so poll for changes.
    watch: {
      usePolling: true,
      interval: 800,
    },
    host: 'localhost',
  },
});
