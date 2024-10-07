const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {ConstructorParameters<typeof ModuleFederationPlugin>[0]} */
const common = {
	name: "container",
	exposes: {
		"./ComponentA": {
			import: "./ComponentA"
		}
	},
	shared: {
		react: {
			version: false,
			requiredVersion: false
		}
	}
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		entry: {},
		output: {
			filename: "[name].js",
			uniqueName: "0-container-full"
		},
		optimization: {
			runtimeChunk: "single"
		},
		plugins: [
			new ModuleFederationPlugin({
				library: { type: "commonjs-module" },
				filename: "container.js",
				remotes: {
					containerA: {
						external: "./container.js"
					}
				},
				...common
			})
		]
	},
	{
		experiments: {
			outputModule: true
		},
		optimization: {
			runtimeChunk: "single"
		},
		output: {
			filename: "module/[name].mjs",
			uniqueName: "0-container-full-mjs"
		},
		plugins: [
			new ModuleFederationPlugin({
				library: { type: "module" },
				filename: "module/container.mjs",
				remotes: {
					containerA: {
						external: "./container.mjs"
					}
				},
				...common
			})
		],
		target: "node14"
	}
];
