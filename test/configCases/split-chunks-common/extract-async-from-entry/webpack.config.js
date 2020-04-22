/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index",
		second: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			minSize: 1
		}
	}
};
