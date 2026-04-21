import { a, b, c, d, e } from "dep";

export const chained = /*#__PURE__*/ a?.();
export const tagged = /*#__PURE__*/ b`hello ${"world"}`;
export const negated = !c;
export const typed = typeof d;
export const voided = void e;
