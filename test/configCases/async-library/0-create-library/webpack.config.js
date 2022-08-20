/** @type {import("../../../../types").Configuration} */
module.exports = {
	entry: "./a.js",
	output: {
		filename: "lib.js",
		library: {
			type: "module"
		}
	},
	target: "node14",
	optimization: {
		minimize: true
	},
	experiments: {
		topLevelAwait: true,
		outputModule: true
	}
};
