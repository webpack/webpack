"use strict";

module.exports = {
	evaluateScriptOnAttached: true,
	findBundle(index, options) {
		const extension = options.output.module ? "mjs" : "js";
		return [`runtime.${index}.${extension}`, `main.${index}.${extension}`];
	}
};
