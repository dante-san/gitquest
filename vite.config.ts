import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Vite config for GitQuest:
// - Tailwind v4 via @tailwindcss/vite
// - React handled via the built-in JSX/TSX support
export default defineConfig({
  plugins: [tailwindcss()],
  base: "/gitquest/", // This is crucial for GitHub Pages!
});
