"use strict";

/** @import { Configuration } from "../../../../" */

// Every back-edge here is async, weak or a self-reference, so none of them
// forces the entry to be evaluated again.
/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		circularDependencies: true
	}
};
