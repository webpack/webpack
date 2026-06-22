// top-level await module, loaded via dynamic import so the entry stays sync
const value = await Promise.resolve("tla");

export const tla = value;
