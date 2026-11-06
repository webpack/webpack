"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		// merged into every `asset/*` type, `asset/source` included: not a rule's
		generator: { asset: { filename: "assets/[name][ext]" } },
		rules: [
			// a JavaScript type takes no generator options
			{ test: /value\.js$/, generator: { binary: false } },
			// nor does `asset/source`
			{ test: /\.txt$/, type: "asset/source", generator: { encoding: "utf8" } },
			// `asset/resource` does, so it must not warn
			{ test: /\.svg$/, type: "asset/resource", generator: { binary: false } }
		]
	}
};
