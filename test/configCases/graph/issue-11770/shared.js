import value from "./dep";

const derived = value;

export const val = /*#__PURE__*/ (() => value + derived)();

export const other = "other";
