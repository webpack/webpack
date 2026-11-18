"use strict";

const TypeScriptTypesDependency = require("../../lib/typescript/TypeScriptTypesDependency");

/**
 * A TypeScript source blanked as a build's code generation blanks it, from
 * the `typeRanges` its parse collected.
 * @param {string} source the TypeScript source
 * @param {number[]} typeRanges what its parse with `typescript: true` skipped
 * @returns {string} the JavaScript the build emits for it, offset for offset
 */
const blankTypeScript = (source, typeRanges) => {
	let blanked = "";
	let at = 0;
	for (const [start, end, text] of TypeScriptTypesDependency.blanks(
		source,
		typeRanges
	)) {
		blanked += source.slice(at, start) + text;
		at = end;
	}
	return blanked + source.slice(at);
};

module.exports = blankTypeScript;
