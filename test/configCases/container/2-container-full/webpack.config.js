const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ModuleFederationPlugin({
			name: "container",
			library: { type: "commonjs-module" },
			filename: "container.js",
			remotes: {
				containerB: "../1-container-full/container.js"
			},
			shared: ["react"]
		})
	]
};
