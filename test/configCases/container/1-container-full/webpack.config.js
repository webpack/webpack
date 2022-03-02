// eslint-disable-next-line node/no-unpublished-require
const { ModuleFederationPlugin } = require("../../../../").container;

const common = {
	entry: {
		main: "./index.js"
	},
	optimization: {
		runtimeChunk: "single"
	}
};

/** @type {ConstructorParameters<typeof ModuleFederationPlugin>[0]} */
const commonMF = {
	runtime: false,
	exposes: {
		"./ComponentB": "./ComponentB",
		"./ComponentC": "./ComponentC"
	},
	shared: ["react"]
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		...common,
		output: {
			filename: "[name].js",
			uniqueName: "1-container-full"
		},
		plugins: [
			new ModuleFederationPlugin({
				name: "container",
				library: { type: "commonjs-module" },
				filename: "container.js",
				remotes: {
					containerA: "../0-container-full/container.js",
					containerB: "./container.js"
				},
				...commonMF
			})
		]
	},
	{
		...common,
		experiments: {
			outputModule: true
		},
		output: {
			filename: "module/[name].mjs",
			uniqueName: "1-container-full-mjs"
		},
		plugins: [
			new ModuleFederationPlugin({
				name: "container",
				library: { type: "module" },
				filename: "module/container.mjs",
				remotes: {
					containerA: "../../0-container-full/module/container.mjs",
					containerB: "./container.mjs"
				},
				...commonMF
			})
		],
		target: "node14"
	}
];
