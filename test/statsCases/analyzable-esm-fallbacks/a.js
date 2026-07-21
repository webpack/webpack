// Two entries pull the same async chunk → it lives in two chunk groups (shared).
export const load = () => import("./async").then((m) => m.value);
