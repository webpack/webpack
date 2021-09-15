const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ModuleFederationPlugin({
			name: "container",
			library: { type: "commonjs-module" },
			filename: "container.js",
			exposes: {
				"./ComponentA": {
					import: "./ComponentA"
				}
			},
			remotes: {
				containerA: {
					external: "./container.js"
				}
			},
			shared: {
				react: {
					version: false,
					requiredVersion: false
				}
			}
		})
	]
};
