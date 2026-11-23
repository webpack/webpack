// the origin of every `import()` imports this, so it has run when they load
globalThis.crossChunkInitEffects = [];

/**
 * Returns the effects logged since the last call.
 * @returns {string[]} the effects
 */
export const takeEffects = () => globalThis.crossChunkInitEffects.splice(0);
