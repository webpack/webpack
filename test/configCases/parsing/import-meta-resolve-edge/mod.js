// Only a single statically-known specifier is turned into an asset; every other
// form must be left untouched (and, being non-static, is not tree-shakeable).
export const staticResolve = import.meta.resolve("./file.txt");
export const dynamicResolve = import.meta.resolve(String(globalThis.x));
export const noArgs = import.meta.resolve();
export const twoArgs = import.meta.resolve("./file.txt", {});
export const spread = import.meta.resolve(...globalThis.args);
