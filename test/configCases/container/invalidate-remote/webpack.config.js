"use strict";

const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new ModuleFederationPlugin({
			name: "host",
			remoteType: "var",
			remotes: {
				// App2 is provided as a global variable via test.config.js moduleScope
				app2: "App2"
			},
			shareScope: "default"
		})
	]
};
