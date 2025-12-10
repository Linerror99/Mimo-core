import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  // Optimize for faster initial load in Docker
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    force: false
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    watch: {
      usePolling: true, // Required for Docker volume mounting
      interval: 1000
    },
    hmr: {
      overlay: true
    }
  }
});
