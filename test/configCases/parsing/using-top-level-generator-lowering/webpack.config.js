"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// `es2016` has generators but not `async`/`await`, so the async module body is
	// driven as a generator — the top-level `using` must still dispose at its end.
	target: ["node", "es2016"]
};
