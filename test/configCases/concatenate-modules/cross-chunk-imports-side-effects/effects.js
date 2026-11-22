// the origin of every `import()` imports this, so it has run when they load
globalThis.crossChunkEffects = [];

/**
 * Returns the effects logged since the last call.
 * @returns {string[]} the effects
 */
export const takeEffects = () => globalThis.crossChunkEffects.splice(0);
