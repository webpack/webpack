import { a, b, c, d, e, f, g } from "dep";

export const chained = /*#__PURE__*/ a?.();
export const tagged = /*#__PURE__*/ b`hello ${"world"}`;
export const negated = !c;
export const typed = typeof d;
export const voided = void e;
export const eqStrict = f === undefined;
export const neStrict = g !== null;
