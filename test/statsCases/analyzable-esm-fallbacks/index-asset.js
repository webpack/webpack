// Both forms: the url is what a missing `import.meta` or an unusable base blocks,
// while the chunk `import()` is emitted by the module chunk loader either way.
export const url = new URL("./asset.txt", import.meta.url);
export const load = () => import("./async").then((m) => m.value);
