import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Les PNG de assets/symbols sont servis tels quels sous /symbols/…
  publicDir: "assets",
});
