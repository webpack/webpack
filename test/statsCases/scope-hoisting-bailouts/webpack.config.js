module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: {
		index: "./index.js",
		entry: "./entry.js"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	externals: ["external"],
	stats: {
		assets: false,
		optimizationBailout: true
	}
};
