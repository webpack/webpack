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
		entry: {
			main: "./index.js",
			other: "./index-2.js"
		},
		output: {
			filename: "[name].js",
			uniqueName: "ref-hoist"
		},
		optimization: {
			runtimeChunk: "single",
			moduleIds: "named",
			chunkIds: "named"
		},
		plugins: [
			new ModuleFederationPlugin({
				runtime: false,
				library: { type: "commonjs-module" },
				filename: "container.js",
				remotes: {
					containerA: {
						external: "./container.js"
					},
					containerB: {
						external: "../0-container-full/container.js"
					}
				},
				...common
			})
		]
	},
	{
		entry: {
			main: "./index.js",
			other: "./index-2.js"
		},
		experiments: {
			outputModule: true
		},
		optimization: {
			runtimeChunk: "single",
			moduleIds: "named",
			chunkIds: "named"
		},
		output: {
			filename: "module/[name].mjs",
			uniqueName: "ref-hoist-mjs"
		},
		plugins: [
			new ModuleFederationPlugin({
				runtime: false,
				library: { type: "module" },
				filename: "module/container.mjs",
				remotes: {
					containerA: {
						external: "./container.mjs"
					},
					containerB: {
						external: "../../0-container-full/module/container.mjs"
					}
				},
				...common
			})
		],
		target: "node14"
	}
];
