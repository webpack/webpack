const meta = Object(import.meta);
const { main } = import.meta;

export const bare = meta.main;
export const direct = import.meta.main;
export const destructured = main;
