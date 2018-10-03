const stats = {
	hash: false,
	timings: false,
	builtAt: false,
	assets: false,
	chunks: true,
	chunkOrigins: true,
	entrypoints: true,
	modules: false
};
module.exports = [
	{
		name: "production",
		mode: "production",
		entry: {
			main: "./"
		},
		output: {
			filename: "prod-[name].js"
		},
		optimization: {
			moduleIds: "natural",
			chunkIds: "natural",
			splitChunks: {
				minSize: 100,
				maxSize: 1000,
				chunks: "all"
			}
		},
		stats
	},
	{
		name: "development",
		mode: "development",
		entry: {
			main: "./"
		},
		output: {
			filename: "dev-[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 100,
				maxSize: 1000,
				chunks: "all"
			}
		},
		stats
	}
];
