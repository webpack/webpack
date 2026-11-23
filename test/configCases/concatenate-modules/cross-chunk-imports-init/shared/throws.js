globalThis.crossChunkInitThrows++;

if (globalThis.crossChunkInitThrows > 0) throw new Error("init failed");

export const value = "value";
