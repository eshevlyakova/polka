import { aiDevPlugin } from "./aiDevPlugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [react(), aiDevPlugin()],
  base: "./",
  server: { port: 5173 },
});
