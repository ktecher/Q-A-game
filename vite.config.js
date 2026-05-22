import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // Main SPA + the standalone phone drawing page (Pictionary challenge).
        main: 'index.html',
        draw: 'draw.html',
      },
    },
  },
  server: {
    // WSL + /mnt/c/ files: inotify is unreliable, so poll for changes.
    watch: {
      usePolling: true,
      interval: 800,
    },
    // host:true binds all interfaces so a phone on the LAN can reach the dev
    // server — needed to test draw.html on a real device.
    host: true,
  },
});
