module.exports = {
	entry: {
		tst_examples_uiform: "./tst_examples_uiform",
		tst_examples_uitable: "./tst_examples_uitable",
		another: "./another"
	},
	output: {
		pathinfo: "verbose",
		filename: "[name].js"
	},
	target: "web",
	optimization: {
		sideEffects: true,
		concatenateModules: true,
		splitChunks: {
			cacheGroups: {
				vendors: {
					chunks: "all",
					test: /vendors/,
					enforce: true,
					name: "vendors"
				}
			}
		}
	}
};
