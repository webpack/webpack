"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	// hot/dev-server pulls in hot/emitter (node `events`); bundle it instead of
	// externalizing via createRequire, which the ESM test runner can't resolve
	externalsPresets: { node: false }
};
