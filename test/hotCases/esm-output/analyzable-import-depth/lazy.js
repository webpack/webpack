export const load = () => import("./a").then((m) => m.value);
---
export const load = () => import("./b").then((m) => m.value);
