import value from "./dep";
import value2 from "./dep2";
import * as dep2 from "./dep2";
import Super from "./super";

const derived = value;

export const val = /*#__PURE__*/ (() => value + derived)();

export const val2a = value2;
export const val2b = value2;
export const val2c = value2;

export const other = "other";

export class Test extends Super {}
