"use strict";

module.exports = {
	findBundle(i, options) {
		if (
			options &&
			options.output &&
			typeof options.output.filename === "string"
		) {
			return [options.output.filename];
		}

		const bundles = ["primary.js", "dual.js", "triple.js", "debug-fn.js"];
		return bundles[i] ? [bundles[i]] : [];
	}
};
