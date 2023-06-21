// eslint-disable-next-line node/no-unpublished-require
const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ModuleFederationPlugin({
			name: "container",
			filename: "container.js",
			exposes: ["./module"],
			library: { type: "commonjs-module" },
			shared: {
				// Exact context match
				react: {
					exclusionCriteria: {
						version: "> 2.0.0"
					}
				},
				// Effectively, not shared
				"react-dom": {
					exclusionCriteria: {
						version: "2"
					}
				}
			}
		})
	]
};
