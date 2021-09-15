const entry = {
	"././../entry/point/./../": "./index.js",
	"/////": "./index.js",
	"../entry": "./index.js"
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "async-node",
		entry,
		output: {
			filename: "async-node/folder/x-[name]-x/file.js",
			chunkFilename: "async-node/chunks/x-[name]-x/file.js"
		}
	},
	{
		target: "node",
		entry,
		output: {
			filename: "node/folder/x-[name]-x/file.js",
			chunkFilename: "node/chunks/x-[name]-x/file.js"
		}
	},
	{
		target: "webworker",
		entry,
		output: {
			filename: "webworker/folder/x-[name]-x/file.js",
			chunkFilename: "webworker/chunks/x-[name]-x/file.js"
		}
	}
];
