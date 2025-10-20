import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Allow access from other devices on the network
    port: 5173,       // Keep the default Vite port
    strictPort: true, // Prevents Vite from changing the port
    proxy: {
      '/api': 'http://localhost:5000', // Proxy API requests to the Node.js backend
    },
  },
});

