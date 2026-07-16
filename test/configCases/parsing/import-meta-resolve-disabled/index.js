// With `importMeta.resolve` disabled the call is preserved for the native ESM
// runtime instead of being turned into an asset; the specifier must not be
// added to the module graph.
export const resolved = import.meta.resolve("./file.txt");
