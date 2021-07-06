/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js",
		imported: {
			import: "./imported.js",
			library: {
				type: "module"
			}
		}
	},
	target: "node14",
	output: {
		filename: "[name].mjs"
	},
	externals: "./imported.mjs",
	experiments: {
		outputModule: true
	},
	optimization: {
		concatenateModules: true
	}
};
