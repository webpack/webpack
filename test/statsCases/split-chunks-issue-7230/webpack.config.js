const stats = {
	hash: false,
	timings: false,
	builtAt: false,
	assets: true,
	chunks: false,
	chunkOrigins: false,
	entrypoints: true,
	modules: false
};
module.exports = {
	name: "default",
	mode: "production",
	entry: {
		core: "./core",
		main: "./main"
	},
	output: {
		filename: "[name].bundle.js"
	},
	optimization: {
		runtimeChunk: {
			name: "runtime"
		},
		splitChunks: {
			cacheGroups: {
				default: false,
				vendors: false,
				core: {
					chunks: "all",
					name: "core",
					minChunks: 2,
					minSize: 0,
					preserveEntrypoint: true
				}
			}
		}
	},
	stats
};
