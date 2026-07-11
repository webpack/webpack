export const foo = "foo";

export const usedResolve = import.meta.resolve("./lang/used.json");

// Unused export (computed access) — inner-graph should drop this asset import.
export const unusedResolve = import.meta["resolve"]("./lang/unused.json");
