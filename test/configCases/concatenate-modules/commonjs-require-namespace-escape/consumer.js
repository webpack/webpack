// None of these reads name an export statically, so the exports objects must
// keep their written names: a mangled one silently answers `undefined` here.
const esm = require("./esm-target");
const cjs = require("./cjs-target");

export const esmKeys = Object.keys(esm).sort();
export const cjsKeys = Object.keys(cjs).sort();
export const spread = { ...cjs };
export const looped = (() => {
	const names = [];
	for (const name in cjs) names.push(name);
	return names.sort();
})();
export const byComputedName = (name) => cjs[name];
export const stringified = JSON.stringify(cjs);
export const esmMarker = esm.__esModule;
