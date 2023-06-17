// eslint-disable-next-line node/no-unpublished-require
const { ModuleFederationPlugin } = require("../../../../").container;
const path = require("path");

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
					exclude: [path.normalize(path.join(__dirname, "node_modules/bar"))]
				},
				// Effectively, not shared
				"react-dom": {
					exclude: /container-exclude-sharing/
				}
			}
		})
	]
};
