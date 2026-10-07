import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { packHtml } from "./scripts/pack-html.js";

function renameBuiltHtml(targetName) {
  let outDir = "dist";

  return {
    name: "rename-built-html",
    configResolved(config) {
      outDir = config.build.outDir || outDir;
    },
    closeBundle() {
      const distDir = path.resolve(process.cwd(), outDir);
      const sourcePath = path.join(distDir, "index.html");
      const targetPath = path.join(distDir, targetName);

      if (!fs.existsSync(sourcePath)) {
        return;
      }

      const original = fs.readFileSync(sourcePath);
      const packed = packHtml(original);
      const buildBytes = packed.length;
      if (buildBytes >= 5_000_000) {
        throw new Error(`Creative must be below 5MB; built ${buildBytes} bytes.`);
      }

      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }

      fs.writeFileSync(targetPath, packed);
      fs.unlinkSync(sourcePath);
      console.log(`Lossless creative: ${buildBytes.toLocaleString()} bytes (media unchanged).`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
    renameBuiltHtml("primeprometics_acslanot_mip_20260708_01_emily_scrollable_human_none.html"),
  ],
  build: {
    // Preserve the explicit MRAID guards for network static validation.
    minify: false,
    modulePreload: {
      polyfill: false,
    },
    assetsInlineLimit: 1024 * 1024,
  },
});
