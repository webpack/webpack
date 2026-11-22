globalThis.crossChunkOptionEffects = [];

/**
 * Returns the effects logged since the last call.
 * @returns {string[]} the effects
 */
export const takeEffects = () => globalThis.crossChunkOptionEffects.splice(0);
