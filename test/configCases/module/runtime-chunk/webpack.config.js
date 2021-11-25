/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].mjs"
	},
	target: ["web", "es2020"],
	experiments: {
		outputModule: true
	},
	optimization: {
		minimize: true,
		runtimeChunk: "single"
	}
};
