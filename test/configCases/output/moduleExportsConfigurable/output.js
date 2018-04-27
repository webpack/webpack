import { cjs } from "./cjs.js";
import defaultEs6, { es6NamedExport, es6ExportSpecifier } from "./es6.js";
import { esm } from "./esm.mjs";

export function smokeTest() {
	return [cjs(), es6NamedExport(), esm()];
}

export function es6DeepDive() {
	return [defaultEs6(), es6NamedExport(), es6ExportSpecifier()];
}
