module.exports = {
	entry: {
		vendors: ["./module"],
		main: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		noEmitOnErrors: false,
		splitChunks: {
			cacheGroups: {
				vendors: {
					test: /module/,
					chunks: "all",
					name: "vendors",
					enforce: true
				}
			}
		}
	}
};
