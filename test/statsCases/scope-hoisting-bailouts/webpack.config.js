module.exports = {
	mode: "production",
	entry: {
		index: "./index.js",
		entry: "./entry.js"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	stats: {
		assets: false,
		optimizationBailout: true
	}
};
