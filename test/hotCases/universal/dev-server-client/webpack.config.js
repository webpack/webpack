"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// hot/dev-server pulls in hot/emitter (node `events`); bundle it instead of
	// externalizing via createRequire, which the ESM test runner can't resolve
	externalsPresets: { node: false }
};
