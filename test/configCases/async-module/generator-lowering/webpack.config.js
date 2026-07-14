"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// `es2016` supports generators but not `async`/`await`, so async modules are
	// lowered to generator functions instead of emitting `async`/`await`.
	target: ["node", "es2016"],
	optimization: {
		concatenateModules: false
	},
	experiments: {
		topLevelAwait: true
	}
};
