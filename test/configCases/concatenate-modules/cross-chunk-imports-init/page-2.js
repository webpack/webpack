import "./local-2.js";
import { pair } from "./shared/pure.js";

export { early } from "./shared/declarations.js";
export { both } from "./shared/cycle-a.js";
export { default as expression } from "./shared/expression.js";

globalThis.crossChunkInitEffects.push("page-2");

export const run = () => pair;
