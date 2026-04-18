import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: "popup.html",
        background: "src/service/background.ts",
        content: "src/content/content.ts"
      },
      output: {
        entryFileNames: "[name].js"
      }
    }
  }
});