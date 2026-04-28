"use strict";

module.exports = {
	findBundle(i, options) {
		const ext =
			options.experiments && options.experiments.outputModule ? "mjs" : "js";
		// With concatenateModules: true the CSS variants are concatenated
		// into the entry, so only the main bundle file exists.
		return [`bundle${i}.${ext}`];
	}
};
