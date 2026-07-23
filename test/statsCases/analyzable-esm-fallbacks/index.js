// Baseline: an analyzable `import("./async.mjs")` literal + the `.ei` runtime helper.
export const load = () => import("./async").then((m) => m.value);
