"use strict";

const {
	experiments: {
		schemes: { HttpUriPlugin }
	}
} = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new HttpUriPlugin({
			allowedUris: [/^http:\/\/localhost:9991\//g],
			upgrade: false,
			frozen: false,
			cacheLocation: false
		})
	]
};
