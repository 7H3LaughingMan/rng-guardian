import { defineConfig } from "vite";
import module from "./module.json" with { type: "json" };
import wasm from "vite-plugin-wasm";

export default defineConfig({
    build: {
        lib: {
            entry: "src/index.ts",
            formats: ["es"],
            fileName: module.id
        },
        minify: false,
        sourcemap: true
    },
    plugins: [wasm()]
});
