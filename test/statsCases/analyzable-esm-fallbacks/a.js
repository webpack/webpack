// Two entries pull the same async chunk → it lives in two chunk groups (shared),
// which stays analyzable: `.ei` dedupes on `installedChunks`.
export const load = () => import("./async").then((m) => m.value);
