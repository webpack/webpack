// This module lives in a split vendor chunk (see webpack.config.js).
// The URL asset here is still reachable from the HTML entry, so its
// hint should also be emitted into the HTML head, not into the JS runtime.
export const hero = new URL("./image.png", import.meta.url);
