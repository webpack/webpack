/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js",
		charset: false
	},
	performance: {
		hints: false
	},
	optimization: {
		chunkIds: "named",
		minimize: false
	}
};
