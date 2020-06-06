const { MinChunkSizePlugin } = require("../../../").optimize;

const baseConfig = {
	mode: "production",
	target: "web",
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
	output: {
		filename: "without-[name].js"
	},
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
	output: {
		filename: "with-[name].js"
	},
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

/** @type {import("../../../").Configuration[]} */
module.exports = [withoutNamedEntry, withNamedEntry];
