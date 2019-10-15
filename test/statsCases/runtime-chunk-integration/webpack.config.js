const { MinChunkSizePlugin } = require("../../../").optimize;

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

const withoutNamedEntry = {
	...baseConfig,
	name: "base",
	entry: {
		main1: "./main1"
	},
	optimization: {
		runtimeChunk: "single"
	}
};

const withNamedEntry = {
	...baseConfig,
	name: "manifest is named entry",
	entry: {
		main1: "./main1",
		manifest: "./f"
	},
	optimization: {
		runtimeChunk: {
			name: "manifest"
		}
	}
};

module.exports = [withoutNamedEntry, withNamedEntry];
