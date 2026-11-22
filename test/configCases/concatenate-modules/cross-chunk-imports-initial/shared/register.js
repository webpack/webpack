globalThis.crossChunkRegistered = (globalThis.crossChunkRegistered || 0) + 1;

export const registered = () => globalThis.crossChunkRegistered;
