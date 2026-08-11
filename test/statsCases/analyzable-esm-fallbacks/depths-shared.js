// Duplicated into both chunks above, so it sits at two output depths at once.
export const load = () => import("./async").then((m) => m.value);
