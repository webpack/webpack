// A dynamic import stays on webpack's on-demand runtime (like Vite's
// __vitePreload) — it is NOT rendered as a static hint.
import(/* webpackPrefetch: true */ "./lazy.js");

console.log("app");
