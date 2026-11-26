"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	// extend the universal pair with the webworker environment
	target: ["web", "node", "webworker"]
};
