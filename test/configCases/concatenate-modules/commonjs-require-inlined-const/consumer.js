// The import may be inlined as a literal; the require() reads the same names off
// the exports object, so they have to stay properties of it.
import { NUMBER } from "./constants";

const whole = require("./constants");

export const fromImport = NUMBER;
export const fromRequire = whole.NUMBER;
export const textFromRequire = whole.TEXT;
