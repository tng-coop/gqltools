import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import esbuild from "rollup-plugin-esbuild";
import postcss from "rollup-plugin-postcss";
import { defineConfig } from "rollup";

export default defineConfig({
  input: "./src/renderer/index.ts", // Entry point for the renderer code
  output: {
    file: "./dist/renderer/index.js",
    format: "iife", // Suitable for browser usage
    sourcemap: true,
    name: "ClearButton", // Provide a name for the IIFE bundle
  },
  plugins: [
    resolve({
      browser: true, // Resolve for browser environment
      preferBuiltins: false, // Ensure we aren't pulling in Node.js built-ins
    }),
    commonjs(), // Convert CommonJS modules to ES6
    typescript({
      useTsconfigDeclarationDir: true, // Ensure correct d.ts file generation
      tsconfigOverride: {
        compilerOptions: {
          declaration: true,
          declarationDir: "./dist/renderer",
        },
        include: ["src/renderer/**/*"], // Focus on renderer files
      },
    }),
    esbuild({
      minify: true, // Enable minification with esbuild
      target: "es2015", // Specify ECMAScript target, e.g., ES2015+
    }),
    postcss({
      extract: false, // Don't extract into a separate file
      modules: false, // Disable CSS Modules
      inject: true, // Enable automatic injection
    }),
  ],
  external: [
    // Add external dependencies you want to exclude from the bundle
  ],
  watch: {
    include: "src/renderer/**",
    clearScreen: false, // Prevent screen clearing during rebuilds
  },
});
