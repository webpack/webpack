// `eval()` keeps it out of every concatenation, so it renders in the registry
export { x, y as renamed } from "./shared/named.js";
export * from "./shared/star.js";
export * as ns from "./shared/ns.js";

export const evaluated = eval("1");
