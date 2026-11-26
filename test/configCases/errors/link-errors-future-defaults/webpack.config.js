"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	// `futureDefaults` sets `exportsPresence: "error"`, which the reexport
	// variant falls back to, so both link errors fail the build.
	experiments: {
		futureDefaults: true
	}
};
