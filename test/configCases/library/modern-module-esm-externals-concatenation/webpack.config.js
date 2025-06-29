/** @type {import("../../../../types").Configuration} */
module.exports = {
	cache: {
		type: "memory" // Enable memory cache to test serialization
	},
	mode: "development",
	entry: {
		main: "./index.js",
		test: "./test-module.js"
	},
	output: {
		module: true,
		library: {
			type: "modern-module"
		},
		filename: "[name].js",
		chunkFormat: "module"
	},
	experiments: {
		outputModule: true
	},
	externalsType: "module",
	externals: {
		external_esm: "external_esm",
		external_unused: "external_unused",
		external_never_used: "external_never_used",
		external_totally_unused: "external_totally_unused",
		external_partially_unused: "external_partially_unused",
		external_nested: "external_nested"
	},
	optimization: {
		concatenateModules: true,
		usedExports: true,
		moduleIds: "named",
		mangleExports: false
	},
	plugins: []
};
