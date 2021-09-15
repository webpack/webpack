/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index?0",
		second: "./index?1"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				commons: {
					chunks: "initial",
					minSize: 0,
					name: "commons"
				}
			}
		}
	}
};
