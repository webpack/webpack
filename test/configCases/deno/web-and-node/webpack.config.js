"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "deno",
	// The harness picks the bundle extension from the raw config (before the
	// deno target's ESM default applies), so set ESM output explicitly.
	output: {
		module: true
	}
};
