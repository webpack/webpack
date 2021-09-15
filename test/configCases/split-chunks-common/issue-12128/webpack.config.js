/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index",
		main2: "./index2"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				common: {
					chunks: "initial",
					minSize: 0,
					name: "common"
				}
			}
		}
	}
};
