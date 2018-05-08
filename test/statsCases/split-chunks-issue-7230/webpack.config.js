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
		splitChunks: {
			cacheGroups: {
				core: {
					name: "core",
					chunks: "initial",
					minSize: 0,
					minChunks: 1,
					reuseExistingChunk: true,
					enforce: true,
					preserveEntrypoint: true,
					test(module, chunks) {
						if (module.depth === 0) {
							return false;
						}

						return chunks.some(chunk => {
							return chunk.name === "core";
						});
					}
				},
				default: false,
				vendors: false
			}
		}
	},
	stats
};
