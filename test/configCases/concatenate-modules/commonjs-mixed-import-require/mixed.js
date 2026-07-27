import { esmBump, esmValue } from "./esm-dep.js";
// bare side-effect import of a wrapped module: nothing here reads its exports,
// so only the import edge can evaluate it -- and it must do so before this
// body runs, i.e. ahead of the require() below
import "./wrapped-cjs.js";

global.__mixedOrder = (global.__mixedOrder || []).concat("mixed");

const cjs = require("./cjs-dep.js");
const { name: destructuredName } = require("./cjs-dep.js");
const wrapped = require("./wrapped-cjs.js");

export const combined = `${esmValue}+${cjs.name}`;
export const bumped = esmBump(1);
export const cjsNamespace = cjs;
export const cjsName = destructuredName;
export const wrappedNamespace = wrapped;

export function nextFromCjs() {
	return cjs.next();
}
