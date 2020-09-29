const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		chunkIds: "named",
		moduleIds: "named"
	},
	output: {
		strictModuleExceptionHandling: true
	},
	plugins: [
		new ModuleFederationPlugin({
			name: "container",
			library: { type: "commonjs-module" },
			filename: "container.js",
			exposes: ["./module"],
			remotes: {
				remote: "./container.js",
				invalid: "./invalid.js"
			}
		})
	],
	experiments: {
		topLevelAwait: true
	}
};
