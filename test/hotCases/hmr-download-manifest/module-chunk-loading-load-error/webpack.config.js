"use strict";

module.exports = {
	output: {
		module: true,
		// A browser rejects a failed import() with a TypeError that has no code.
		importFunctionName:
			"((url) => import(url).catch(error => { throw new TypeError(error.message); }))",
		library: {
			type: "module"
		}
	}
};
