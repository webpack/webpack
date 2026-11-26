"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		// export writes stay in the bundle, so whatever they would run is observed
		usedExports: false,
		concatenateModules: false,
		moduleIds: "named"
	}
};
