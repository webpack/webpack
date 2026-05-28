// Mixed: direct const export + re-exports in the same module
export const ownConst = "own";
export { literal as reConst } from "./const-exports";
export { fn as reFn } from "./function-exports";
export { counter as reCounter, increment as reIncrement } from "./mutable-exports";
