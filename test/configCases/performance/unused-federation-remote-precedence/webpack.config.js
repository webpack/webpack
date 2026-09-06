"use strict";

const { ContainerReferencePlugin } = require("../../../../").container;

// `factorize` takes the first name a request matches, so `app` swallows
// everything `app/foo` would have served and leaves it dead.
/** @type {import("../../../../").Configuration} */
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
