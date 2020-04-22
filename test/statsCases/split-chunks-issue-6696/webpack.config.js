const stats = {
	hash: false,
	timings: false,
	builtAt: false,
	assets: false,
	chunks: true,
	chunkRelations: true,
	chunkOrigins: true,
	entrypoints: true,
	modules: false
};
/** @type {import("../../../").Configuration} */
module.exports = {
	name: "default",
	mode: "production",
	entry: {
		main: "./"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				default: false,
				vendors: {
					test: /[\\/]node_modules[\\/]/,
					chunks: "initial",
					enforce: true,
					name: "vendors"
				}
			}
		}
	},
	stats
};
