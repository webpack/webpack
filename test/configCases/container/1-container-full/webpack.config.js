// eslint-disable-next-line node/no-unpublished-require
const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle0: "./index.js"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new ModuleFederationPlugin({
			name: "container",
			library: { type: "commonjs-module" },
			filename: "container.js",
			runtime: false,
			exposes: {
				"./ComponentB": "./ComponentB",
				"./ComponentC": "./ComponentC"
			},
			remotes: {
				containerA: "../0-container-full/container.js",
				containerB: "./container.js"
			},
			shared: ["react"]
		})
	],
	optimization: {
		runtimeChunk: "single"
	}
};
