/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	target: "web",
	experiments: {
		outputModule: true
	},
	optimization: {
		minimize: true,
		runtimeChunk: "single"
	}
};
