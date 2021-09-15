const { ModuleFederationPlugin } = require("../../../").container;

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	output: {
		filename: "[name]_bundle.js"
	},
	plugins: [
		new ModuleFederationPlugin({
			name: "container",
			exposes: {
				"./entry": {
					import: "./entry",
					name: "custom-entry"
				}
			}
		})
	]
};
