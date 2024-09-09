import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import esbuild from "rollup-plugin-esbuild";
import postcss from "rollup-plugin-postcss";
import { defineConfig } from "rollup";

// Renderer process configuration
const rendererConfig = {
  input: "./src/renderer/index.ts", // Entry point for the renderer code
  output: {
    file: "./dist/renderer/index.js",
    format: "iife", // Suitable for browser usage
    sourcemap: true,
    name: "RendererBundle", // Name for the IIFE bundle
  },
  plugins: [
    resolve({
      browser: true, // Resolve for browser environment
      preferBuiltins: false, // Prevent Node.js built-ins in the renderer
    }),
    commonjs(), // Convert CommonJS modules to ES6
    typescript({
      useTsconfigDeclarationDir: true, // Ensure d.ts file generation
      tsconfigOverride: {
        compilerOptions: {
          declaration: true,
          declarationDir: "./dist/renderer", // Output directory for types
        },
        include: ["src/renderer/**/*"], // Include only renderer files
      },
    }),
    esbuild({
      minify: true, // Enable minification with esbuild
      target: "es2015", // ECMAScript target
    }),
    postcss({
      extract: false, // Don't extract CSS into a separate file
      modules: false, // Disable CSS Modules
      inject: true, // Automatically inject CSS
    }),
  ],
  external: [], // Add external dependencies if necessary
  watch: {
    include: "src/renderer/**", // Watch for changes in the renderer
    clearScreen: false, // Prevent screen clearing during rebuilds
  },
};

// Main process configuration using ES Modules (esm)
const mainConfig = {
  input: "./src/main.ts", // Entry point for the Electron main process
  output: {
    file: "./dist/main.js",
    format: "esm", // Use ES module format to support `import.meta.url`
    sourcemap: true,
  },
  plugins: [
    resolve({
      preferBuiltins: true, // Allow Node.js built-ins like 'fs', 'path', etc.
    }),
    commonjs(), // Convert CommonJS modules to ES6
    typescript({
      useTsconfigDeclarationDir: true, // Ensure d.ts file generation
      tsconfigOverride: {
        compilerOptions: {
          declaration: true,
          declarationDir: "./dist", // Output directory for types
        },
        include: ["src/main.ts"], // Include only main files
      },
    }),
    esbuild({
      minify: false, // No need to minify the main process
      target: "es2020", // Set a modern target that supports `import.meta.url`
    }),
  ],
  external: ["electron"], // Exclude Electron from being bundled
  watch: {
    include: "src/main.ts", // Watch for changes in the main process
    clearScreen: false,
  },
};

// Preload process configuration
const preloadConfig = {
  input: "./src/preload.ts", // Entry point for the preload script
  output: {
    file: "./dist/preload.js", // Output preload script to the correct location
    format: "esm", // ES module format for modern JavaScript
    sourcemap: true,
  },
  plugins: [
    resolve({
      preferBuiltins: true, // Allow Node.js built-ins for preload (Electron context)
    }),
    commonjs(), // Convert CommonJS modules to ES6
    typescript({
      useTsconfigDeclarationDir: true, // Ensure d.ts file generation
      tsconfigOverride: {
        compilerOptions: {
          declaration: true,
          declarationDir: "./dist", // Output directory for types
        },
        include: ["src/preload.ts"], // Include only preload files
      },
    }),
    esbuild({
      minify: false, // No need to minify preload script
      target: "es2020", // Set a modern target for Electron
    }),
  ],
  external: ["electron"], // Exclude Electron from being bundled
  watch: {
    include: "src/preload.ts", // Watch for changes in the preload script
    clearScreen: false,
  },
};

// Export all configurations
export default defineConfig([rendererConfig, mainConfig, preloadConfig]);
