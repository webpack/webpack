/** @type {import("../../../../types").Configuration} */
module.exports = {
	entry: "./index.js",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		library: {
			type: "module"
		},
		filename: "[name].mjs",
		chunkFormat: "module"
	},
	externals: {
		"external-module-a": "module ./external-a.mjs",
		"external-module-b": "module ./external-b.mjs"
	},
	externalsType: "module",
	optimization: {
		concatenateModules: false
	}
};
