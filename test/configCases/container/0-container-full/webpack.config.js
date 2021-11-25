const { ModuleFederationPlugin } = require("../../../../").container;

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
		output: {
			filename: "[name].js"
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
		output: {
			filename: "module/[name].mjs"
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
