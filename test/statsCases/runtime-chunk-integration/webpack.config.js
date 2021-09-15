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
	name: "static custom name",
	entry: {
		main1: "./main1",
		main2: "./main2",
		main3: "./main3"
	},
	optimization: {
		runtimeChunk: {
			name: "manifest"
		}
	}
};

const withFunctionEntry = {
	...baseConfig,
	output: {
		filename: "func-[name].js"
	},
	name: "dynamic custom name",
	entry: {
		main1: "./main1",
		main2: "./main2",
		main3: "./main3"
	},
	optimization: {
		runtimeChunk: {
			name: ({ name }) => (name === "main3" ? "a" : "b")
		}
	}
};

/** @type {import("../../../").Configuration[]} */
module.exports = [withoutNamedEntry, withNamedEntry, withFunctionEntry];
