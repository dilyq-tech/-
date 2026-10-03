import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Keep one predictable URL for the local browser and for other devices on the LAN.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
});
