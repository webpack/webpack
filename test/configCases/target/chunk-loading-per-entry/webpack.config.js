const base = {
	entry: {
		web: "./web",
		webworker: {
			import: "./webworker",
			chunkLoading: "import-scripts"
		}
	},
	target: "web"
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ ...base, output: { ...base.output, filename: "[name]-0.js" } },
	{ ...base, output: { ...base.output, filename: "[name]-1.js" } }
];
