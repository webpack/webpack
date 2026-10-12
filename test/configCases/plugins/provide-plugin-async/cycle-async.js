import "./cycle-bridge.js";

await Promise.resolve();
throw new Error("provided cycle failure");

export const value = 42;
