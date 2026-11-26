"use strict";

const { ContainerReferencePlugin } = require("../../../../").container;

/** @import { Configuration } from "../../../../" */

// `factorize` takes the first name a request matches, so `app` swallows
// everything `app/foo` would have served and leaves it dead.
/** @type {Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	plugins: [
		new ContainerReferencePlugin({
			remoteType: "var",
			remotes: { app: "APP", "app/foo": "FOO" }
		})
	]
};
