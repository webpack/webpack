const entry = {
	"././../weird-names2-out/entry/point/./../entry": "./index.js",
	"..//weird-names2-out////entry": "./index.js"
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "async-node",
		entry,
		output: {
			filename: "[name]-async-node.js",
			chunkFilename: "chunks/[name]-async-node.js"
		}
	},
	{
		target: "node",
		entry,
		output: {
			filename: "[name]-node.js",
			chunkFilename: "chunks/[name]-node.js"
		}
	},
	{
		target: "webworker",
		entry,
		output: {
			filename: "[name]-webworker.js",
			chunkFilename: "chunks/[name]-webworker.js"
		}
	}
];
