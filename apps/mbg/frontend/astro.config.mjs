import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Static output is the default — `astro build` emits ./dist with index.html at root.
export default defineConfig({
  integrations: [react()],
});
