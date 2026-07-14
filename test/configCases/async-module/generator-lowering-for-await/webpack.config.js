"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// `es2016` has generators but not `async`/`await`. A module using top-level
	// `for await…of` can't be lowered to a generator, so it keeps the async
	// output and must warn.
	target: ["node", "es2016"],
	experiments: {
		topLevelAwait: true
	}
};
