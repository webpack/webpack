import state from "./state.js";

export const value = 42;
/** @returns {boolean} whether the async entry has finished */
export const isReady = () => state.ready;
