import * as lib from "./pure-lib";

const key = "make";
const values = [3];

export const literal = /*#__PURE__*/ lib.fns["make"](1);
export const template = /*#__PURE__*/ lib.fns[`make`](2);
export const dynamicTemplate = /*#__PURE__*/ lib.fns[`${key}`](3);
export const computed = /*#__PURE__*/ lib.fns[key](4);
export const spread = /*#__PURE__*/ lib.make(...values);
