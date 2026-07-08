"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Opt out of the `asyncWebAssembly: "auto"` default so this case keeps
	// exercising the "WebAssembly not enabled" error it is meant to verify.
	experiments: {
		asyncWebAssembly: false
	}
};
