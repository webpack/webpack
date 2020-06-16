/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js"
	},
	performance: {
		hints: false
	},
	optimization: {
		chunkIds: "named",
		minimize: false
	}
};
