// Two chunks naming each other: each hash would feed the other.
export const load = () => Promise.all([import("./a-cycle.js"), import("./b-cycle.js")]);
