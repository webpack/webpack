/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		output: {
			filename: "[name].bundle0.js"
		},
		optimization: {
			chunkIds: "named"
		}
	},
	{
		output: {
			filename: "[name].bundle1.js",
			chunkFilename: "chunk-[name].bundle1.js"
		},
		optimization: {
			chunkIds: "named"
		}
	},
	{
		output: {
			filename: "[name].bundle2.js",
			chunkFilename: () => "chunk-fn-[name].bundle2.js"
		},
		optimization: {
			chunkIds: "named"
		}
	},
	{
		output: {
			filename: "[name].bundle3.js",
			workerChunkFilename: "worker-[name].bundle3.js"
		},
		optimization: {
			chunkIds: "named"
		}
	},
	{
		output: {
			filename: "[name].bundle4.js",
			workerChunkFilename: () => "worker-fn-[name].bundle4.js"
		},
		optimization: {
			chunkIds: "named"
		}
	},
	{
		output: {
			filename: "[name].bundle5.js",
			chunkFilename: "chunk-[name].bundle5.js",
			workerChunkFilename: "worker-[name].bundle5.js"
		},
		optimization: {
			chunkIds: "named"
		}
	}
];
