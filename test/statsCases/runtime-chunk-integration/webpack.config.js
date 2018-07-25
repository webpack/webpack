const MinChunkSizePlugin = require("../../../lib/optimize/MinChunkSizePlugin");

const baseConfig = {
	mode: "production",
	target: "web",
	output: {
		filename: "[name].js"
	},
	stats: {
		hash: false,
		timings: false,
		builtAt: false
	},
	plugins: [
		new MinChunkSizePlugin({
			minChunkSize: 1000
		})
	]
};

const withoutNamedEntry = Object.assign({}, baseConfig, {
	name: "base",
	entry: {
		main1: "./main1"
	},
	optimization: {
		moduleIds: "natural",
		chunkIds: "natural",
		runtimeChunk: "single"
	}
});

const withNamedEntry = Object.assign({}, baseConfig, {
	name: "manifest is named entry",
	entry: {
		main1: "./main1",
		manifest: "./f"
	},
	optimization: {
		moduleIds: "natural",
		chunkIds: "natural",
		runtimeChunk: {
			name: "manifest"
		}
	}
});

module.exports = [withoutNamedEntry, withNamedEntry];
